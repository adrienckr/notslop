/**
 * `notslop pulse <topic>` — mention tracker over a window (default 7d).
 *
 * In addition to the standard fetch+rerank output, prints a tiny per-source
 * histogram showing total mentions in the window.
 */

import kleur from "kleur";
import ora from "ora";

import {
  type PrintMeta,
  printError,
  printJson,
  printMarkdown,
  printTable,
  progressLine,
} from "../output.js";
import { rerank } from "../rerank/zeroentropy.js";
import type { FetchQuery, Post, SourceName } from "../types.js";
import {
  type CommandOptions,
  fetchAll,
  loadOrExit,
  parseOutputFormat,
  parseSince,
  parseTop,
  selectPlatforms,
} from "./_shared.js";

interface PulseOptions extends CommandOptions {
  window?: string;
}

function writeln(line = ""): void {
  process.stdout.write(`${line}\n`);
}

function colorSource(source: SourceName): string {
  switch (source) {
    case "reddit":
      return kleur.cyan(source);
    case "hn":
      return kleur.magenta(source);
    case "blogs":
      return kleur.blue(source);
    case "x":
      return kleur.bold().white(source);
    default:
      return source;
  }
}

/** ASCII bar of length proportional to `count / max`, capped at `width`. */
function bar(count: number, max: number, width = 20): string {
  if (max <= 0) return " ".repeat(width);
  const filled = Math.max(0, Math.min(width, Math.round((count / max) * width)));
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

function aggregateBySource(posts: Post[]): Map<SourceName, number> {
  const counts = new Map<SourceName, number>();
  for (const post of posts) {
    counts.set(post.source, (counts.get(post.source) ?? 0) + 1);
  }
  return counts;
}

function printHistogram(posts: Post[], title: string): void {
  const counts = aggregateBySource(posts);
  if (counts.size === 0) return;
  const max = Math.max(...counts.values());
  writeln();
  writeln(kleur.bold().white(title));
  // Stable order: reddit, hn, blogs, x
  const order: SourceName[] = ["reddit", "hn", "blogs", "x"];
  for (const src of order) {
    const c = counts.get(src);
    if (c === undefined) continue;
    const label = colorSource(src).padEnd(14, " ");
    writeln(
      `  ${label} ${kleur.dim("|")} ${bar(c, max)}  ${kleur.bold(String(c))} ${kleur.dim("mentions")}`,
    );
  }
}

export async function pulseCommand(topic: string, opts: PulseOptions): Promise<void> {
  try {
    if (!topic || topic.trim().length === 0) {
      printError('topic is required. usage: notslop pulse "<topic>"');
      process.exit(1);
    }

    const format = parseOutputFormat(opts.format);
    // `pulse` uses --window if provided, falling back to --since, falling back to 7d.
    const since = parseSince(opts.window ?? opts.since ?? "7d");
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
      query: topic,
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
          text: `Pulse: scanning ${platforms.length} sources over ${since}…`,
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
      const meta: PrintMeta = {
        title: `Pulse: ${topic}`,
        fetched,
        total_posts: 0,
        reranked: 0,
        duration_ms: Date.now() - t0,
      };
      if (format === "json") {
        process.stdout.write(`${JSON.stringify({ ranked: [], mentions: {} }, null, 2)}\n`);
      } else if (format === "table") {
        printTable([], meta);
      } else {
        printMarkdown(meta.title, [], meta);
      }
      return;
    }

    const rerankSpinner = isJson
      ? null
      : ora({ text: "Reranking via ZeroEntropy…", spinner: "dots" }).start();

    let ranked: Awaited<ReturnType<typeof rerank>>;
    try {
      ranked = await rerank(posts, topic, config, { topN });
    } catch (err) {
      if (rerankSpinner) rerankSpinner.fail("Rerank failed.");
      throw err;
    }
    if (rerankSpinner) rerankSpinner.stop();

    const meta: PrintMeta = {
      title: `Pulse: ${topic} (window: ${since})`,
      fetched,
      total_posts: posts.length,
      reranked: ranked.length,
      duration_ms: Date.now() - t0,
    };

    if (format === "json") {
      const counts = aggregateBySource(posts);
      const mentions: Record<string, number> = {};
      for (const [k, v] of counts.entries()) mentions[k] = v;
      const payload = {
        topic,
        window: since,
        mentions,
        ranked: ranked.map((r) => ({ rank: r.rank, ze_score: r.ze_score, post: r.post })),
      };
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else if (format === "table") {
      printTable(ranked, meta);
      printHistogram(posts, `Mentions over ${since}`);
    } else {
      printMarkdown(meta.title, ranked, meta);
      printHistogram(posts, `Mentions over ${since}`);
    }

    if (opts.debug && !isJson) {
      writeln();
      process.stdout.write(
        `${kleur.dim(`debug: ${posts.length} raw posts, ${ranked.length} ranked`)}\n`,
      );
    }
  } catch (err) {
    printError((err as Error).message);
    process.exit(1);
  }
}
