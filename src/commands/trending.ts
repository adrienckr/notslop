/**
 * `notslop trending <niche>` — same fetch+rerank flow as digest, but
 * with a shorter default window. "Trending" implies recent — 6h unless the
 * user overrides --since.
 */

import kleur from "kleur";
import ora from "ora";

import {
  type PrintMeta,
  printDim,
  printError,
  printJson,
  printMarkdown,
  printTable,
  progressLine,
} from "../output.js";
import { rerank } from "../rerank/zeroentropy.js";
import type { FetchQuery } from "../types.js";
import {
  type CommandOptions,
  fetchAll,
  loadOrExit,
  parseOutputFormat,
  parseSince,
  parseTop,
  selectPlatforms,
} from "./_shared.js";

function writeln(line = ""): void {
  process.stdout.write(`${line}\n`);
}

export async function trendingCommand(niche: string, opts: CommandOptions): Promise<void> {
  try {
    if (!niche || niche.trim().length === 0) {
      printError('niche is required. usage: notslop trending "<niche>"');
      process.exit(1);
    }

    const format = parseOutputFormat(opts.format);
    // Trending defaults to 6h instead of digest's 24h.
    const since = parseSince(opts.since ?? "6h");
    const topN = parseTop(opts.top, 10);
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

    const query: FetchQuery = {
      query: niche,
      since,
      per_source_limit: config.per_source_limit,
      subreddits: config.subreddits.length > 0 ? config.subreddits : undefined,
      x_profiles: config.x_profiles.length > 0 ? config.x_profiles : undefined,
      blog_urls: config.blogs.length > 0 ? config.blogs : undefined,
    };

    const t0 = Date.now();
    const progressBuffer: string[] = [];
    const fetchSpinner = isJson
      ? null
      : ora({
          text: `Scanning ${platforms.length} sources for trending signal…`,
          spinner: "dots",
        }).start();

    const { posts, fetched } = await fetchAll(
      platforms,
      query,
      config,
      (name, status, _count, detail) => {
        progressBuffer.push(progressLine(name, status, detail ?? ""));
      },
    );

    if (fetchSpinner) {
      fetchSpinner.stop();
      for (const line of progressBuffer) writeln(line);
    }

    if (posts.length === 0) {
      if (!isJson) writeln();
      const meta: PrintMeta = {
        title: `Trending: ${niche}`,
        fetched,
        total_posts: 0,
        reranked: 0,
        duration_ms: Date.now() - t0,
      };
      if (format === "json") printJson([]);
      else if (format === "table") printTable([], meta);
      else printMarkdown(meta.title, [], meta);
      return;
    }

    const rerankSpinner = isJson
      ? null
      : ora({ text: "Reranking via ZeroEntropy…", spinner: "dots" }).start();

    let ranked: Awaited<ReturnType<typeof rerank>>;
    try {
      ranked = await rerank(posts, niche, config, { topN });
    } catch (err) {
      if (rerankSpinner) rerankSpinner.fail("Rerank failed.");
      throw err;
    }
    if (rerankSpinner) rerankSpinner.stop();

    const meta: PrintMeta = {
      title: `Trending: ${niche}`,
      fetched,
      total_posts: posts.length,
      reranked: ranked.length,
      duration_ms: Date.now() - t0,
    };

    if (format === "json") printJson(ranked);
    else if (format === "table") printTable(ranked, meta);
    else printMarkdown(meta.title, ranked, meta);

    if (opts.debug && !isJson) {
      writeln();
      printDim("debug: ZE rerank scores");
      for (const item of ranked) {
        printDim(
          `  #${item.rank}  ${kleur.bold(item.ze_score.toFixed(4))}  [${item.post.source}] ${item.post.title.slice(0, 80)}`,
        );
      }
    }
  } catch (err) {
    printError((err as Error).message);
    process.exit(1);
  }
}
