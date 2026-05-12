/**
 * Shared helpers used by the digest / trending / pulse / voices commands.
 *
 * Centralizes:
 *   - the master list of platforms and the source-selection logic
 *   - fan-out fetch with per-source progress reporting
 *   - option parsing for the common flags (--since, --format, --config)
 *   - config loading with friendly "missing key / run init" errors
 */

import ora from "ora";

import type { Platform } from "../platforms/_base.js";
import { blogsPlatform } from "../platforms/blogs.js";
import { hnPlatform } from "../platforms/hn.js";
import { redditPlatform } from "../platforms/reddit.js";
import { xBrightdataPlatform } from "../platforms/x_brightdata.js";

import { DEFAULT_CONFIG_PATH, configExists, loadConfig } from "../config.js";
import type { PrintMeta } from "../output.js";
import { printError } from "../output.js";
import type { Config, DurationToken, FetchQuery, NamedList, OutputFormat, Post } from "../types.js";

export interface CommandOptions {
  since?: string;
  sources?: string;
  list?: string;
  top?: string;
  format?: string;
  debug?: boolean;
  /** commander auto-inverts --no-cache to .cache=false */
  cache?: boolean;
  config?: string;
}

/** Stable platform order used everywhere the CLI fans out. */
export const ALL_PLATFORMS: readonly Platform[] = [
  redditPlatform,
  hnPlatform,
  blogsPlatform,
  xBrightdataPlatform,
] as const;

const VALID_DURATIONS: readonly DurationToken[] = ["1h", "6h", "24h", "7d", "30d", "all"] as const;
const VALID_FORMATS: readonly OutputFormat[] = ["json", "md", "table"] as const;

/**
 * Select platforms that are (a) enabled by user config, and (b) explicitly
 * listed in the comma-separated --sources flag when one is provided.
 */
export function selectPlatforms(config: Config, sourcesFlag?: string): Platform[] {
  const requested = sourcesFlag
    ? new Set(
        sourcesFlag
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter((s) => s.length > 0),
      )
    : undefined;

  const out: Platform[] = [];
  for (const platform of ALL_PLATFORMS) {
    if (!platform.isEnabled(config)) continue;
    if (requested && !requested.has(platform.name)) continue;
    out.push(platform);
  }
  return out;
}

export interface FetchAllResult {
  posts: Post[];
  fetched: PrintMeta["fetched"];
}

/**
 * Run `platform.fetch` for every enabled platform in parallel. Each platform
 * gets its own live spinner that transitions to a check (succeed) or X (fail)
 * on completion. `onProgress` is still called for each platform so callers can
 * attach their own listeners if needed.
 */
export async function fetchAll(
  platforms: Platform[],
  query: FetchQuery,
  config: Config,
  onProgress: (name: string, status: "ok" | "skip" | "err", count: number, detail?: string) => void,
): Promise<FetchAllResult> {
  const spinners = new Map<string, ReturnType<typeof ora>>();
  const useSpinners = process.stdout.isTTY ?? false;
  if (useSpinners) {
    for (const p of platforms) {
      const s = ora({ text: `${p.name}…`, spinner: "dots" });
      s.start();
      spinners.set(p.name, s);
    }
  }

  const settled = await Promise.allSettled(
    platforms.map(async (p) => {
      const posts = await p.fetch(query, config);
      const s = spinners.get(p.name);
      if (s) s.succeed(`${p.name.padEnd(8, " ")} ${posts.length} posts`);
      return { name: p.name, posts };
    }),
  );

  const allPosts: Post[] = [];
  const fetched: PrintMeta["fetched"] = [];

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const platform = platforms[i];
    if (!platform) continue;
    if (result && result.status === "fulfilled") {
      const { name, posts } = result.value;
      const count = posts.length;
      const status: "ok" | "skip" = count > 0 ? "ok" : "skip";
      const detail = count > 0 ? `${count} posts` : "no posts in window";
      onProgress(name, status, count, detail);
      fetched.push({ source: name, count, status, detail });
      allPosts.push(...posts);
    } else if (result && result.status === "rejected") {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      const s = spinners.get(platform.name);
      if (s) s.fail(`${platform.name.padEnd(8, " ")} error: ${reason}`);
      onProgress(platform.name, "err", 0, reason);
      fetched.push({ source: platform.name, count: 0, status: "err", detail: reason });
    }
  }

  return { posts: allPosts, fetched };
}

export function parseOutputFormat(s?: string): OutputFormat {
  const v = (s ?? "md").toLowerCase();
  if ((VALID_FORMATS as readonly string[]).includes(v)) return v as OutputFormat;
  throw new Error(`invalid --format "${s}". expected one of: ${VALID_FORMATS.join(", ")}`);
}

export function parseSince(s?: string): DurationToken {
  const v = (s ?? "24h").toLowerCase();
  if ((VALID_DURATIONS as readonly string[]).includes(v)) return v as DurationToken;
  throw new Error(`invalid --since "${s}". expected one of: ${VALID_DURATIONS.join(", ")}`);
}

export function parseTop(s?: string, fallback = 10): number {
  if (s === undefined) return fallback;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`invalid --top "${s}". expected a positive integer`);
  }
  return n;
}

/**
 * Resolve a --list <name> flag into partial FetchQuery overrides. When a named
 * list is provided it replaces the corresponding config-level field so only
 * items in the list are queried. Throws on unknown list names so the user gets
 * an actionable message rather than a silent no-op.
 */
export function resolveList(
  config: Config,
  listName: string | undefined,
): Partial<{ x_profiles: string[]; blogs: string[]; subreddits: string[] }> {
  if (!listName) return {};
  const found: NamedList | undefined = config.named_lists.find((l) => l.name === listName);
  if (!found) {
    throw new Error(
      `list "${listName}" not found — run \`notslop list ls\` to see available lists`,
    );
  }
  switch (found.kind) {
    case "x_profiles":
      return { x_profiles: found.items };
    case "blogs":
      return { blogs: found.items };
    case "subreddits":
      return { subreddits: found.items };
  }
}

/**
 * Load config from disk and verify a ZE key is reachable (file or env). On any
 * failure path we print a single actionable error and exit(1).
 */
export function loadOrExit(configPath?: string): Config {
  const path = configPath ?? DEFAULT_CONFIG_PATH;
  const envKey = process.env.ZEROENTROPY_API_KEY;
  const fileExists = configExists(path);

  if (!fileExists && !envKey) {
    printError("no config found. run `notslop init` first to set up your ZeroEntropy key.");
    process.exit(1);
  }

  let config: Config;
  try {
    config = loadConfig({ path, allowMissing: !!envKey });
  } catch (err) {
    printError(`failed to load config: ${(err as Error).message}`);
    process.exit(1);
  }

  if (!config.zeroentropy_api_key) {
    printError(
      "ZEROENTROPY_API_KEY not set. run `notslop init` or export ZEROENTROPY_API_KEY in your shell.",
    );
    process.exit(1);
  }

  return config;
}
