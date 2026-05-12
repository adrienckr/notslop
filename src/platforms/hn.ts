/**
 * Hacker News platform. Uses the Algolia HN search API — no auth required and
 * no User-Agent restrictions. Story-only filter; comments are out of scope for
 * this source.
 */

import { request } from "undici";

import { cacheGet, cacheKey, cacheSet } from "../cache.js";
import type { Config, FetchQuery, Post } from "../types.js";
import { durationToRange, truncateText, type Platform } from "./_base.js";

interface HnHit {
  objectID: string;
  title?: string | null;
  story_text?: string | null;
  comment_text?: string | null;
  author?: string;
  created_at: string;
  url?: string | null;
  points?: number | null;
  num_comments?: number | null;
}

interface HnSearchResponse {
  hits?: HnHit[];
}

function isHnHit(value: unknown): value is HnHit {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.objectID === "string" && typeof v.created_at === "string";
}

async function fetchJson(url: string, ttlSeconds: number): Promise<HnSearchResponse> {
  const key = cacheKey("hn", url);
  const cached = cacheGet<HnSearchResponse>(key);
  if (cached) return cached;

  const { statusCode, body } = await request(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`hn fetch failed: HTTP ${statusCode}`);
  }

  const text = await body.text();
  const parsed = JSON.parse(text) as HnSearchResponse;
  cacheSet(key, parsed, ttlSeconds);
  return parsed;
}

function normalize(hit: HnHit): Post {
  const title = hit.title ?? "";
  const text = truncateText(hit.story_text ?? hit.comment_text ?? "");
  return {
    id: `hn_${hit.objectID}`,
    source: "hn",
    title,
    text,
    author: hit.author,
    posted_at: hit.created_at,
    url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
    score: hit.points ?? 0,
    comments: hit.num_comments ?? 0,
  };
}

/**
 * Fetch and normalize Hacker News stories from the Algolia search API. Filters
 * by `query.since` server-side via `numericFilters=created_at_i>...`.
 */
export async function fetchHnSearch(query: FetchQuery, config: Config): Promise<Post[]> {
  const limit = query.per_source_limit ?? config.per_source_limit;
  const { start } = durationToRange(query.since);
  const startUnix = Math.floor(start.getTime() / 1000);

  const q = encodeURIComponent(query.query);
  const numericFilter = encodeURIComponent(`created_at_i>${startUnix}`);
  const url =
    `https://hn.algolia.com/api/v1/search` +
    `?query=${q}&tags=story&numericFilters=${numericFilter}&hitsPerPage=${limit}`;

  const response = await fetchJson(url, config.cache_ttl_seconds);
  const hits = response.hits ?? [];

  const posts: Post[] = [];
  for (const raw of hits) {
    if (!isHnHit(raw)) continue;
    posts.push(normalize(raw));
  }

  posts.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return posts;
}

export const hnPlatform: Platform = {
  name: "hn",
  isEnabled() {
    return true;
  },
  fetch(query, config) {
    return fetchHnSearch(query, config);
  },
};
