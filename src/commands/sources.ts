/**
 * `notslop sources` — show the status of every scraping source + rerank provider.
 *
 * Without `--check`: a static pass over ~/.notslop/config.json + env vars. Tells
 * the user which keys are wired, which are missing, and where to set them.
 *
 * With `--check <name>`: a live test of one source/provider. Tiny round-trip
 * against the real API to verify the key + endpoint actually work.
 */

import kleur from "kleur";
import ora from "ora";
import { request } from "undici";

import { DEFAULT_CONFIG_PATH, configExists, loadConfig } from "../config.js";
import { embedTexts } from "../embed/zeroentropy.js";
import { printError } from "../output.js";
import { fetchHnSearch } from "../platforms/hn.js";
import { fetchRedditSearch } from "../platforms/reddit.js";
import { rerank } from "../rerank/zeroentropy.js";
import type { Config, FetchQuery, Post } from "../types.js";

function writeln(line = ""): void {
  process.stdout.write(`${line}\n`);
}

function maskKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= 7) return "********";
  return `${trimmed.slice(0, 7)}${"*".repeat(8)}`;
}

function checkmark(): string {
  return kleur.green("✔");
}

function cross(): string {
  return kleur.red("✘");
}

function loadConfigSafe(configPath: string | undefined): Config {
  const path = configPath ?? DEFAULT_CONFIG_PATH;
  // sources never exits on a missing config — the whole point is to TELL the
  // user what's missing. Treat absent config like an empty one.
  try {
    return loadConfig({ path, allowMissing: true });
  } catch (err) {
    printError(`failed to load config: ${(err as Error).message}`);
    process.exit(1);
  }
}

interface SourcesOptions {
  check?: string;
  config?: string;
}

export async function sourcesCommand(opts: SourcesOptions): Promise<void> {
  try {
    const config = loadConfigSafe(opts.config);

    if (opts.check) {
      await runCheck(opts.check.toLowerCase(), config);
      return;
    }

    printStatus(config, opts.config);
  } catch (err) {
    printError((err as Error).message);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Static status (no network)
// ---------------------------------------------------------------------------

function printStatus(config: Config, configPath: string | undefined): void {
  const path = configPath ?? DEFAULT_CONFIG_PATH;
  writeln();
  writeln(kleur.bold().white("notslop sources"));
  if (configExists(path)) {
    writeln(kleur.dim(`  config: ${path}`));
  } else {
    writeln(kleur.dim("  config: (none — run `notslop init`)"));
  }
  writeln();

  writeln(kleur.bold().white("For scraping:"));
  writeln(
    formatRow("reddit", true, "no key needed", `${config.subreddits.length} subs configured`),
  );
  writeln(formatRow("hn", true, "no key needed", "global Algolia search"));
  writeln(
    formatRow(
      "blogs",
      true,
      "no key needed (RSS auto-discovery)",
      `${config.blogs.length} URLs configured`,
    ),
  );
  writeln();

  writeln(`  ${kleur.bold().white("X (Twitter):")}`);
  if (config.orthogonal_api_key) {
    writeln(
      `  ${checkmark()} ${kleur.bold("orthogonal".padEnd(14, " "))} ${kleur.dim(
        `ORTHOGONAL_API_KEY set (${maskKey(config.orthogonal_api_key)})`,
      )}`,
    );
    writeln(`      ${kleur.dim(`${config.x_profiles.length} X handles configured`)}`);
  } else {
    writeln(`  ${cross()} ${kleur.bold("orthogonal".padEnd(14, " "))}`);
    writeln(`      ${kleur.red("ORTHOGONAL_API_KEY missing.")}`);
    writeln(`      ${kleur.dim("→ Sign up:")} ${kleur.cyan("https://orthogonal.com/sign-up")}`);
    writeln(
      `      ${kleur.dim("→ Setup guide:")} ${kleur.cyan(
        "PROVIDERS.md#x-twitter--via-orthogonal",
      )}`,
    );
    writeln(`      ${kleur.dim("→ Skip X scraping if you only want Reddit/HN/blogs.")}`);
  }
  writeln();

  writeln(kleur.bold().white("For rerank / embed (used locally, never sent to the gateway):"));
  if (config.zeroentropy_api_key) {
    writeln(
      `  ${checkmark()} ${kleur.bold("zeroentropy".padEnd(14, " "))} ${kleur.dim(
        `ZEROENTROPY_API_KEY set (${maskKey(config.zeroentropy_api_key)})`,
      )}`,
    );
  } else {
    writeln(`  ${cross()} ${kleur.bold("zeroentropy".padEnd(14, " "))}`);
    writeln(`      ${kleur.red("ZEROENTROPY_API_KEY missing.")}`);
    writeln(
      `      ${kleur.dim("→ Get a free key:")} ${kleur.cyan("https://dashboard.zeroentropy.dev")}`,
    );
    writeln(
      `      ${kleur.dim("→ Setup guide:")} ${kleur.cyan(
        "PROVIDERS.md#zeroentropy-rerank--embed",
      )}`,
    );
    writeln(
      `      ${kleur.dim("→ Without ZE, no rerank/embed. The CLI is unusable without this key.")}`,
    );
  }
  writeln();
  writeln(
    kleur.dim(
      "Tip: run `notslop sources --check <name>` to live-test a source (reddit, hn, blogs, x, zeroentropy).",
    ),
  );
  writeln();
}

function formatRow(name: string, ok: boolean, description: string, detail: string): string {
  const glyph = ok ? checkmark() : cross();
  const namePadded = kleur.bold(name.padEnd(10, " "));
  const desc = kleur.dim(description.padEnd(38, " "));
  return `  ${glyph} ${namePadded} ${desc} ${kleur.dim(detail)}`;
}

// ---------------------------------------------------------------------------
// Live checks
// ---------------------------------------------------------------------------

const CHECK_NAMES = ["reddit", "hn", "blogs", "x", "zeroentropy"] as const;
type CheckName = (typeof CHECK_NAMES)[number];

function isCheckName(s: string): s is CheckName {
  return (CHECK_NAMES as readonly string[]).includes(s);
}

async function runCheck(name: string, config: Config): Promise<void> {
  if (!isCheckName(name)) {
    printError(`unknown source "${name}". expected one of: ${CHECK_NAMES.join(", ")}`);
    process.exit(1);
  }

  switch (name) {
    case "reddit":
      await checkReddit(config);
      return;
    case "hn":
      await checkHn(config);
      return;
    case "blogs":
      await checkBlogs(config);
      return;
    case "x":
      await checkX(config);
      return;
    case "zeroentropy":
      await checkZeroEntropy(config);
      return;
  }
}

async function checkReddit(config: Config): Promise<void> {
  const sub =
    config.subreddits[0] ??
    config.named_lists.find((l) => l.kind === "subreddits")?.items[0] ??
    "ClaudeAI";
  const spinner = ora({
    text: `reddit: live-testing r/${sub}…`,
    spinner: "dots",
  }).start();
  try {
    const query: FetchQuery = {
      query: "test",
      since: "24h",
      per_source_limit: 5,
      subreddits: [sub],
    };
    const posts = await fetchRedditSearch(query, config);
    spinner.stop();
    writeln(
      `${checkmark()} ${kleur.bold("reddit")}: live test passed (${posts.length} posts from r/${sub})`,
    );
  } catch (err) {
    spinner.stop();
    writeln(`${cross()} ${kleur.bold("reddit")}: ${kleur.red((err as Error).message)}`);
    writeln(
      kleur.dim(
        "  Reddit is keyless — if this is failing, your IP may be blocked or rate-limited.",
      ),
    );
    process.exit(1);
  }
}

async function checkHn(config: Config): Promise<void> {
  const spinner = ora({
    text: "hn: live-testing Algolia search…",
    spinner: "dots",
  }).start();
  try {
    const query: FetchQuery = {
      query: "claude",
      since: "24h",
      per_source_limit: 5,
    };
    const posts = await fetchHnSearch(query, config);
    spinner.stop();
    writeln(`${checkmark()} ${kleur.bold("hn")}: live test passed (${posts.length} stories)`);
  } catch (err) {
    spinner.stop();
    writeln(`${cross()} ${kleur.bold("hn")}: ${kleur.red((err as Error).message)}`);
    process.exit(1);
  }
}

async function checkBlogs(config: Config): Promise<void> {
  const url = config.blogs[0];
  if (!url) {
    writeln(
      `${cross()} ${kleur.bold("blogs")}: no blogs configured. add some with \`notslop init\` or \`notslop list add\`.`,
    );
    process.exit(1);
  }
  const spinner = ora({ text: `blogs: live-testing ${url}…`, spinner: "dots" }).start();
  try {
    const { statusCode } = await request(url, { method: "GET" });
    spinner.stop();
    if (statusCode < 200 || statusCode >= 400) {
      writeln(`${cross()} ${kleur.bold("blogs")}: HTTP ${statusCode} on ${url}`);
      process.exit(1);
    }
    writeln(
      `${checkmark()} ${kleur.bold("blogs")}: live test passed (HTTP ${statusCode} from ${url})`,
    );
  } catch (err) {
    spinner.stop();
    writeln(`${cross()} ${kleur.bold("blogs")}: ${kleur.red((err as Error).message)}`);
    process.exit(1);
  }
}

async function checkX(config: Config): Promise<void> {
  if (!config.orthogonal_api_key) {
    writeln(`${cross()} ${kleur.bold("x")}: ORTHOGONAL_API_KEY missing.`);
    writeln(kleur.dim("  → Setup guide: PROVIDERS.md#x-twitter--via-orthogonal"));
    writeln(
      kleur.dim(
        "  → Without this key, X scraping is disabled. The CLI still works for Reddit/HN/blogs.",
      ),
    );
    process.exit(1);
  }
  const handle = (config.x_profiles[0] ?? "karpathy").replace(/^@/, "");
  const spinner = ora({
    text: `x: live-testing @${handle} via Orthogonal ScrapeCreators…`,
    spinner: "dots",
  }).start();
  try {
    const { statusCode, body } = await request("https://api.orthogonal.com/v1/run", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.orthogonal_api_key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        api: "scrapecreators",
        path: "/v1/twitter/user-tweets",
        query: { handle, trim: "true" },
      }),
    });
    const text = await body.text();
    spinner.stop();
    if (statusCode < 200 || statusCode >= 300) {
      writeln(
        `${cross()} ${kleur.bold("x")}: Orthogonal HTTP ${statusCode} — ${kleur.red(text.slice(0, 200))}`,
      );
      writeln(kleur.dim("  → Setup guide: PROVIDERS.md#x-twitter--via-orthogonal"));
      process.exit(1);
    }
    let priceCents: number | undefined;
    let tweetCount: number | undefined;
    let creditsRemaining: number | undefined;
    try {
      const parsed = JSON.parse(text) as {
        priceCents?: number;
        data?: { tweets?: unknown[]; credits_remaining?: number };
      };
      priceCents = parsed.priceCents;
      tweetCount = Array.isArray(parsed.data?.tweets) ? parsed.data?.tweets.length : undefined;
      creditsRemaining = parsed.data?.credits_remaining;
    } catch {
      // fall through — we still passed the auth check
    }
    const priceSuffix = priceCents !== undefined ? `, priceCents: ${priceCents}` : "";
    const creditSuffix =
      creditsRemaining !== undefined ? `, credits_remaining: ${creditsRemaining}` : "";
    writeln(
      `${checkmark()} ${kleur.bold("x")}: X scrape via Orthogonal ScrapeCreators (${tweetCount ?? "?"} tweets via @${handle}${priceSuffix}${creditSuffix})`,
    );
  } catch (err) {
    spinner.stop();
    writeln(`${cross()} ${kleur.bold("x")}: ${kleur.red((err as Error).message)}`);
    writeln(kleur.dim("  → Setup guide: PROVIDERS.md#x-twitter--via-orthogonal"));
    process.exit(1);
  }
}

async function checkZeroEntropy(config: Config): Promise<void> {
  if (!config.zeroentropy_api_key) {
    writeln(`${cross()} ${kleur.bold("zeroentropy")}: ZEROENTROPY_API_KEY missing.`);
    writeln(kleur.dim("  → Get a free key: https://dashboard.zeroentropy.dev"));
    writeln(kleur.dim("  → Setup guide: PROVIDERS.md#zeroentropy-rerank--embed"));
    process.exit(1);
  }
  const spinner = ora({
    text: "zeroentropy: live-testing rerank + embed…",
    spinner: "dots",
  }).start();
  try {
    const dummyPosts: Post[] = [
      {
        id: "test_1",
        source: "reddit",
        title: "Test post about RAG and retrieval",
        text: "Discussing retrieval-augmented generation in practice.",
        posted_at: new Date().toISOString(),
        url: "https://example.com/1",
      },
      {
        id: "test_2",
        source: "hn",
        title: "Why cats sleep so much",
        text: "Unrelated cat content.",
        posted_at: new Date().toISOString(),
        url: "https://example.com/2",
      },
    ];
    const ranked = await rerank(dummyPosts, "retrieval", config, { topN: 2 });
    const embeds = await embedTexts(["retrieval test"], config);
    spinner.stop();
    const dim = embeds[0]?.length ?? 0;
    writeln(
      `${checkmark()} ${kleur.bold("zeroentropy")}: live test passed (rerank: ${ranked.length} results, embed: dim=${dim})`,
    );
  } catch (err) {
    spinner.stop();
    writeln(`${cross()} ${kleur.bold("zeroentropy")}: ${kleur.red((err as Error).message)}`);
    writeln(kleur.dim("  → Setup guide: PROVIDERS.md#zeroentropy-rerank--embed"));
    process.exit(1);
  }
}
