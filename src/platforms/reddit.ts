/**
 * Reddit platform. Uses the public JSON search API — no auth required.
 *
 * When `query.subreddits` is set we fan out per-sub and merge; otherwise we hit
 * the global `/search.json` endpoint. Responses are cached locally to keep
 * Reddit happy and to amortize repeated invocations of the CLI.
 */

import { request } from "undici";

import { cacheGet, cacheKey, cacheSet } from "../cache.js";
import type { Config, DurationToken, FetchQuery, Post } from "../types.js";
import { type Platform, durationToRange, truncateText } from "./_base.js";

const USER_AGENT = "notslop/0.2 (https://github.com/adrienckr/notslop)";

interface RedditChildData {
  id: string;
  subreddit: string;
  title: string;
  selftext?: string;
  author: string;
  created_utc: number;
  permalink: string;
  score: number;
  num_comments: number;
}

interface RedditChild {
  data: RedditChildData;
}

interface RedditListing {
  data?: {
    children?: RedditChild[];
  };
}

function timeParam(since: DurationToken | undefined): string {
  switch (since) {
    case "1h":
    case "6h":
      return "hour";
    case "24h":
      return "day";
    case "7d":
      return "week";
    case "30d":
      return "month";
    case "all":
      return "all";
    default:
      return "day";
  }
}

function isRedditChild(value: unknown): value is RedditChild {
  if (!value || typeof value !== "object") return false;
  const data = (value as { data?: unknown }).data;
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    typeof d.subreddit === "string" &&
    typeof d.title === "string" &&
    typeof d.author === "string" &&
    typeof d.created_utc === "number" &&
    typeof d.permalink === "string" &&
    typeof d.score === "number" &&
    typeof d.num_comments === "number"
  );
}

const MAX_RETRIES = 3;

function backoffDelay(attempt: number, retryAfterHeader: string | string[] | undefined): number {
  // Honor Reddit's Retry-After (seconds) if present.
  if (retryAfterHeader) {
    const raw = Array.isArray(retryAfterHeader) ? retryAfterHeader[0] : retryAfterHeader;
    const n = Number.parseInt(raw ?? "", 10);
    if (Number.isFinite(n) && n > 0) return Math.min(n * 1000, 30_000);
  }
  // Exponential backoff with jitter: 500ms, 1.5s, 3s.
  const base = 500 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 300);
  return Math.min(base + jitter, 30_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string, ttlSeconds: number): Promise<RedditListing> {
  const key = cacheKey("reddit", url);
  const cached = cacheGet<RedditListing>(key);
  if (cached) return cached;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { statusCode, headers, body } = await request(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (statusCode === 429 || statusCode === 503) {
      // Drain body so undici can reuse the socket.
      await body.text().catch(() => "");
      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `reddit rate-limited (HTTP ${statusCode}) after ${MAX_RETRIES + 1} attempts`,
        );
      }
      await sleep(backoffDelay(attempt, headers["retry-after"]));
      continue;
    }
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`reddit fetch failed: HTTP ${statusCode}`);
    }

    const text = await body.text();
    const parsed = JSON.parse(text) as RedditListing;
    cacheSet(key, parsed, ttlSeconds);
    return parsed;
  }
  throw new Error("reddit fetch failed: exhausted retries");
}

function normalize(child: RedditChild): Post {
  const d = child.data;
  return {
    id: `t3_${d.id}`,
    source: "reddit",
    sub_source: `r/${d.subreddit}`,
    title: d.title,
    text: truncateText(d.selftext ?? ""),
    author: d.author,
    posted_at: new Date(d.created_utc * 1000).toISOString(),
    url: `https://www.reddit.com${d.permalink}`,
    score: d.score,
    comments: d.num_comments,
  };
}

function buildUrl(params: {
  query: string;
  time: string;
  limit: number;
  subreddit?: string;
}): string {
  const q = encodeURIComponent(params.query);
  const base = params.subreddit
    ? `https://www.reddit.com/r/${encodeURIComponent(params.subreddit)}/search.json`
    : "https://www.reddit.com/search.json";
  const sr = params.subreddit ? "&restrict_sr=on" : "";
  return `${base}?q=${q}${sr}&t=${params.time}&limit=${params.limit}`;
}

/**
 * Fetch and normalize Reddit search results for a single query, optionally
 * scoped to one or more subreddits.
 */
export async function fetchRedditSearch(query: FetchQuery, config: Config): Promise<Post[]> {
  const limit = query.per_source_limit ?? config.per_source_limit;
  const time = timeParam(query.since);
  const { start, end } = durationToRange(query.since);

  const urls: string[] = [];
  if (query.subreddits && query.subreddits.length > 0) {
    for (const sub of query.subreddits) {
      urls.push(buildUrl({ query: query.query, time, limit, subreddit: sub }));
    }
  } else {
    urls.push(buildUrl({ query: query.query, time, limit }));
  }

  const listings = await Promise.all(urls.map((url) => fetchJson(url, config.cache_ttl_seconds)));

  const seen = new Set<string>();
  const posts: Post[] = [];
  for (const listing of listings) {
    const children = listing.data?.children ?? [];
    for (const raw of children) {
      if (!isRedditChild(raw)) continue;
      const post = normalize(raw);
      if (seen.has(post.id)) continue;
      const posted = new Date(post.posted_at).getTime();
      if (posted < start.getTime() || posted > end.getTime()) continue;
      seen.add(post.id);
      posts.push(post);
    }
  }

  posts.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return posts;
}

export const redditPlatform: Platform = {
  name: "reddit",
  isEnabled() {
    return true;
  },
  fetch(query, config) {
    return fetchRedditSearch(query, config);
  },
};
