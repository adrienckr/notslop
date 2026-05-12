/**
 * `social-context voices <topic>` — surface influential voices on a topic.
 *
 * Runs the standard fetch+rerank flow, then groups the reranked posts by
 * author, summing ze_score per author. Top --limit (default 5) authors are
 * shown with handle, dominant source, total score, and post count.
 */

import kleur from "kleur";
import ora from "ora";

import { formatHeader, formatFooter, printError, progressLine, type PrintMeta } from "../output.js";
import { rerank } from "../rerank/zeroentropy.js";
import type { FetchQuery, RankedPost, SourceName } from "../types.js";
import {
  fetchAll,
  loadOrExit,
  parseOutputFormat,
  parseSince,
  parseTop,
  selectPlatforms,
  type CommandOptions,
} from "./_shared.js";

interface VoicesOptions extends CommandOptions {
  limit?: string;
}

interface VoiceAggregate {
  author: string;
  total_score: number;
  count: number;
  /** Dominant source for the author (most posts seen there). */
  source: SourceName;
  /** Best (lowest rank number => highest relevance) post by this author. */
  top_post_url: string;
  top_post_title: string;
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

function parseLimit(s: string | undefined): number {
  if (s === undefined) return 5;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`invalid --limit "${s}". expected a positive integer`);
  }
  return n;
}

function aggregateVoices(ranked: RankedPost[]): VoiceAggregate[] {
  interface Acc {
    author: string;
    total_score: number;
    count: number;
    sources: Map<SourceName, number>;
    best_rank: number;
    top_post_url: string;
    top_post_title: string;
  }

  const byAuthor = new Map<string, Acc>();
  for (const r of ranked) {
    const author = r.post.author?.trim();
    if (!author || author === "[deleted]" || author === "anonymous") continue;
    const key = `${r.post.source}:${author}`;
    const existing = byAuthor.get(key);
    if (existing) {
      existing.total_score += r.ze_score;
      existing.count += 1;
      existing.sources.set(r.post.source, (existing.sources.get(r.post.source) ?? 0) + 1);
      if (r.rank < existing.best_rank) {
        existing.best_rank = r.rank;
        existing.top_post_url = r.post.url;
        existing.top_post_title = r.post.title;
      }
    } else {
      byAuthor.set(key, {
        author,
        total_score: r.ze_score,
        count: 1,
        sources: new Map([[r.post.source, 1]]),
        best_rank: r.rank,
        top_post_url: r.post.url,
        top_post_title: r.post.title,
      });
    }
  }

  const out: VoiceAggregate[] = [];
  for (const acc of byAuthor.values()) {
    let dominant: SourceName = "reddit";
    let best = -1;
    for (const [src, n] of acc.sources.entries()) {
      if (n > best) {
        best = n;
        dominant = src;
      }
    }
    out.push({
      author: acc.author,
      total_score: acc.total_score,
      count: acc.count,
      source: dominant,
      top_post_url: acc.top_post_url,
      top_post_title: acc.top_post_title,
    });
  }

  out.sort((a, b) => b.total_score - a.total_score);
  return out;
}

export async function voicesCommand(topic: string, opts: VoicesOptions): Promise<void> {
  try {
    if (!topic || topic.trim().length === 0) {
      printError("topic is required. usage: social-context voices \"<topic>\"");
      process.exit(1);
    }

    const format = parseOutputFormat(opts.format);
    const since = parseSince(opts.since);
    const limit = parseLimit(opts.limit);
    // For voices we rerank a wider pool so the per-author aggregate is meaningful.
    const rerankTop = parseTop(opts.top, 50);
    const isJson = format === "json";

    const config = loadOrExit(opts.config);
    if (opts.cache === false) {
      config.cache_ttl_seconds = 0;
    }

    const platforms = selectPlatforms(config, opts.sources);
    if (platforms.length === 0) {
      printError(
        "no platforms selected. run `social-context init` to enable sources, or pass --sources reddit,hn,blogs,x.",
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
      : ora({ text: `Listening across ${platforms.length} sources…`, spinner: "dots" }).start();

    const { posts, fetched } = await fetchAll(platforms, query, config, (name, status, _count, detail) => {
      progressBuffer.push(progressLine(name, status, detail ?? ""));
    });

    if (fetchSpinner) {
      fetchSpinner.stop();
      for (const line of progressBuffer) writeln(line);
    }

    const meta: PrintMeta = {
      title: `Voices: ${topic}`,
      fetched,
      total_posts: posts.length,
      reranked: 0,
      duration_ms: 0,
    };

    if (posts.length === 0) {
      meta.duration_ms = Date.now() - t0;
      if (format === "json") {
        process.stdout.write(`${JSON.stringify({ voices: [] }, null, 2)}\n`);
      } else {
        writeln();
        writeln(formatHeader(meta.title));
        writeln();
        writeln(kleur.dim("No voices surfaced in this window."));
        writeln();
        writeln(formatFooter(meta));
      }
      return;
    }

    const rerankSpinner = isJson
      ? null
      : ora({ text: "Reranking via ZeroEntropy…", spinner: "dots" }).start();

    let ranked;
    try {
      ranked = await rerank(posts, topic, config, { topN: rerankTop });
    } catch (err) {
      if (rerankSpinner) rerankSpinner.fail("Rerank failed.");
      throw err;
    }
    if (rerankSpinner) rerankSpinner.stop();

    const voices = aggregateVoices(ranked).slice(0, limit);
    meta.reranked = ranked.length;
    meta.duration_ms = Date.now() - t0;

    if (format === "json") {
      process.stdout.write(`${JSON.stringify({ topic, voices }, null, 2)}\n`);
      return;
    }

    writeln();
    writeln(formatHeader(meta.title));
    writeln();

    if (voices.length === 0) {
      writeln(kleur.dim("No authored posts in this window."));
      writeln();
      writeln(formatFooter(meta));
      return;
    }

    let i = 1;
    for (const v of voices) {
      const rank = kleur.bold().white(`${String(i).padStart(2, " ")}.`);
      const handle = v.source === "x" ? `@${v.author}` : v.author;
      const head = `  ${rank} ${kleur.bold().white(handle)}  ${kleur.dim("[")}${colorSource(v.source)}${kleur.dim("]")}`;
      writeln(head);
      writeln(
        `     ${kleur.dim("score")} ${kleur.bold(v.total_score.toFixed(3))}  ${kleur.dim("·")}  ${kleur.bold(String(v.count))} ${kleur.dim(`post${v.count === 1 ? "" : "s"}`)}`,
      );
      writeln(`     ${kleur.dim("top:")} ${kleur.white(v.top_post_title.slice(0, 90))}`);
      writeln(`     ${kleur.dim().underline(v.top_post_url)}`);
      writeln();
      i++;
    }

    writeln(formatFooter(meta));

    if (opts.debug) {
      writeln();
      process.stdout.write(`${kleur.dim(`debug: ${ranked.length} ranked posts aggregated into ${voices.length} voices`)}\n`);
    }
  } catch (err) {
    printError((err as Error).message);
    process.exit(1);
  }
}
