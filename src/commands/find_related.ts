/**
 * `notslop find-related <url-or-text>` — given an input (URL to fetch, or
 * literal text), embed it, fetch recent posts across enabled sources, and
 * return the top N most semantically similar posts.
 *
 * Use case: repurpose flow. The user has a draft (or an existing post), and
 * wants to find recent related discussions to ground the rewrite in.
 */

import { request } from "undici";

import { cosineSimilarity } from "../embed/cosine.js";
import { embedTexts } from "../embed/zeroentropy.js";
import type { Config, FetchQuery, Post, RelatedPost } from "../types.js";

export interface FindRelatedOptions {
  top?: number;
}

function buildDoc(p: Post): string {
  return `${p.title}\n${p.text}`;
}

/** Pure logic: given an input string and a candidate set, rank by similarity. */
export async function findRelatedFromText(
  input: string,
  candidates: Post[],
  config: Config,
  options: FindRelatedOptions = {},
): Promise<RelatedPost[]> {
  if (candidates.length === 0) return [];
  const top = options.top ?? 10;
  const allTexts = [input, ...candidates.map(buildDoc)];
  const vectors = await embedTexts(allTexts, config, { inputType: "query" });
  const inputVec = vectors[0]!;
  const candidateVectors = vectors.slice(1);
  const scored = candidates.map((post, i) => ({
    post,
    similarity: cosineSimilarity(inputVec, candidateVectors[i]!),
  }));
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, top).map((s, i) => ({ ...s, rank: i + 1 }));
}

/** If the user passed a URL, fetch + extract text. Otherwise return as-is. */
export async function resolveInput(rawInput: string): Promise<string> {
  const trimmed = rawInput.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed;
  }
  const { statusCode, body } = await request(trimmed, {
    method: "GET",
    headers: { "User-Agent": "notslop/0.3" },
  });
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`failed to fetch input URL: HTTP ${statusCode}`);
  }
  const text = await body.text();
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

/** Full command: resolve input, fan-out fetch, embed, rank, return. */
export async function findRelatedCommand(
  rawInput: string,
  fetchCandidates: (q: FetchQuery, c: Config) => Promise<Post[]>,
  config: Config,
  options: FindRelatedOptions & { since?: string },
): Promise<RelatedPost[]> {
  const resolved = await resolveInput(rawInput);
  const candidates = await fetchCandidates(
    {
      query: resolved.slice(0, 200),
      since: (options.since as FetchQuery["since"]) ?? "7d",
      per_source_limit: 50,
    },
    config,
  );
  return findRelatedFromText(resolved, candidates, config, options);
}

// ---------------------------------------------------------------------------
// CLI entry — spinner / progress UX
// ---------------------------------------------------------------------------

import kleur from "kleur";
import ora from "ora";

import { formatFooter, formatHeader, printError } from "../output.js";
import {
  type CommandOptions,
  fetchAll,
  loadOrExit,
  parseOutputFormat,
  parseTop,
  selectPlatforms,
} from "./_shared.js";

interface FindRelatedCliOptions extends CommandOptions {
  since?: string;
}

function writeln(line = ""): void {
  process.stdout.write(`${line}\n`);
}

export async function findRelatedCli(input: string, opts: FindRelatedCliOptions): Promise<void> {
  try {
    if (!input || input.trim().length === 0) {
      printError('input is required. usage: notslop find-related "<url-or-text>"');
      process.exit(1);
    }

    const format = parseOutputFormat(opts.format);
    const top = parseTop(opts.top, 10);
    const isJson = format === "json";

    const config = loadOrExit(opts.config);
    if (opts.cache === false) {
      config.cache_ttl_seconds = 0;
    }

    const platforms = selectPlatforms(config, opts.sources);
    if (platforms.length === 0) {
      printError(
        "no platforms selected. run `notslop init` to enable sources, or pass --sources reddit,hn,blogs,x.",
      );
      process.exit(1);
    }

    const t0 = Date.now();
    const resolveSpinner = isJson
      ? null
      : ora({ text: "Resolving input…", spinner: "dots" }).start();
    const resolved = await resolveInput(input);
    if (resolveSpinner) resolveSpinner.stop();

    const fetchSpinner = isJson
      ? null
      : ora({
          text: `Fetching candidates from ${platforms.length} sources…`,
          spinner: "dots",
        }).start();

    const { posts, fetched } = await fetchAll(
      platforms,
      {
        query: resolved.slice(0, 200),
        since: (opts.since as "1h" | "6h" | "24h" | "7d" | "30d" | "all" | undefined) ?? "7d",
        per_source_limit: 50,
      },
      config,
      () => {},
    );

    if (fetchSpinner) fetchSpinner.stop();

    const rankSpinner = isJson
      ? null
      : ora({ text: "Embedding + ranking via ZeroEntropy…", spinner: "dots" }).start();

    const related = await findRelatedFromText(resolved, posts, config, { top });

    if (rankSpinner) rankSpinner.stop();

    if (format === "json") {
      process.stdout.write(
        `${JSON.stringify(
          {
            input: resolved.slice(0, 200),
            related: related.map((r) => ({
              rank: r.rank,
              similarity: r.similarity,
              post: r.post,
            })),
          },
          null,
          2,
        )}\n`,
      );
      return;
    }

    writeln();
    writeln(formatHeader(`Related to: ${resolved.slice(0, 40)}${resolved.length > 40 ? "…" : ""}`));
    writeln();

    if (related.length === 0) {
      writeln(kleur.dim("No related posts found in the window."));
      writeln();
      writeln(
        formatFooter({
          title: "find-related",
          fetched,
          total_posts: posts.length,
          reranked: 0,
          duration_ms: Date.now() - t0,
        }),
      );
      return;
    }

    for (const r of related) {
      const rank = kleur.bold().white(`${String(r.rank).padStart(2, " ")}.`);
      const sim = kleur.dim(`sim ${r.similarity.toFixed(2)}`);
      const src = r.post.source;
      const sub = r.post.sub_source ? ` ${kleur.dim("·")} ${kleur.dim(r.post.sub_source)}` : "";
      writeln(`  ${rank} ${kleur.dim("[")}${src}${sub}${kleur.dim("]")} ${sim}`);
      writeln(`     ${kleur.white(r.post.title)}`);
      writeln(`     ${kleur.dim().underline(r.post.url)}`);
      writeln();
    }

    writeln(
      formatFooter({
        title: "find-related",
        fetched,
        total_posts: posts.length,
        reranked: related.length,
        duration_ms: Date.now() - t0,
      }),
    );
  } catch (err) {
    printError((err as Error).message);
    process.exit(1);
  }
}
