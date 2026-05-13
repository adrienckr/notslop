/**
 * X (Twitter) via Orthogonal — a unified API gateway that proxies to
 * ScrapeCreators (and many other social-scraping providers under one key).
 *
 * Flow per handle:
 *   POST https://api.orthogonal.com/v1/run
 *     body: { api: "scrapecreators", path: "/v1/twitter/user-tweets",
 *             query: { handle, trim: "true" } }
 *
 * Response shape:
 *   {
 *     success: true,
 *     priceCents: 2,
 *     data: {
 *       success: true,
 *       credits_remaining: 3040,
 *       tweets: [{ rest_id, views, legacy: { full_text, created_at,
 *                  favorite_count, reply_count, ... }, url }, ...]
 *     }
 *   }
 *
 * Cost: ~$0.02 per call. ~10 tweets returned per call regardless of input.
 * Each handle is scraped independently and cached separately.
 */

import { request } from "undici";

import { cacheGet, cacheKey, cacheSet } from "../cache.js";
import type { Config, FetchQuery, Post } from "../types.js";
import { type Platform, durationToRange, truncateText } from "./_base.js";

const ORTHOGONAL_URL = "https://api.orthogonal.com/v1/run";

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "notslop/0.8",
    Accept: "application/json",
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

interface OrthogonalTweet {
  rest_id?: string;
  url?: string;
  legacy?: {
    full_text?: string;
    created_at?: string;
    favorite_count?: number;
    reply_count?: number;
    retweet_count?: number;
    quote_count?: number;
  };
}

function coerceTweet(raw: unknown): OrthogonalTweet | null {
  if (!isObject(raw)) return null;
  const legacyRaw = raw.legacy;
  const legacy: OrthogonalTweet["legacy"] = isObject(legacyRaw)
    ? {
        full_text: readString(legacyRaw, "full_text"),
        created_at: readString(legacyRaw, "created_at"),
        favorite_count: readNumber(legacyRaw, "favorite_count"),
        reply_count: readNumber(legacyRaw, "reply_count"),
        retweet_count: readNumber(legacyRaw, "retweet_count"),
        quote_count: readNumber(legacyRaw, "quote_count"),
      }
    : undefined;
  return {
    rest_id: readString(raw, "rest_id"),
    url: readString(raw, "url"),
    legacy,
  };
}

function buildTitle(fullText: string): string {
  const text = fullText.replace(/\s+/g, " ").trim();
  if (text.length <= 100) return text;
  return `${text.slice(0, 100)}…`;
}

function parseDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // Twitter's `Tue Jan 24 20:14:18 +0000 2023` parses natively in Node.
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function normalizeTweet(tweet: OrthogonalTweet, handle: string): Post | null {
  const id = tweet.rest_id;
  const url = tweet.url;
  const fullText = tweet.legacy?.full_text;
  if (!id || !url || !fullText) return null;
  const postedAt = parseDate(tweet.legacy?.created_at) ?? new Date().toISOString();
  return {
    id: `x_${id}`,
    source: "x",
    sub_source: `@${handle}`,
    title: buildTitle(fullText),
    text: truncateText(fullText),
    author: handle,
    posted_at: postedAt,
    url,
    score: tweet.legacy?.favorite_count,
    comments: tweet.legacy?.reply_count,
  };
}

function cleanHandle(raw: string): string {
  return raw.replace(/^@/, "").trim();
}

async function fetchTweetsForHandle(
  apiKey: string,
  handle: string,
  ttlSeconds: number,
): Promise<OrthogonalTweet[]> {
  const clean = cleanHandle(handle);
  const key = cacheKey("x_orthogonal", clean);
  const cached = cacheGet<OrthogonalTweet[]>(key);
  if (cached) return cached;

  const { statusCode, body } = await request(ORTHOGONAL_URL, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      api: "scrapecreators",
      path: "/v1/twitter/user-tweets",
      query: { handle: clean, trim: "true" },
    }),
  });
  const text = await body.text();

  if (statusCode === 401) {
    throw new Error(
      `Orthogonal auth failed — check ORTHOGONAL_API_KEY (response: ${text.slice(0, 200)})`,
    );
  }
  if (statusCode === 402) {
    throw new Error(
      `Orthogonal payment required — top up credits at https://orthogonal.com (response: ${text.slice(0, 200)})`,
    );
  }
  if (statusCode === 429) {
    throw new Error(`Orthogonal rate-limited: ${text.slice(0, 200)}`);
  }
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Orthogonal request failed: HTTP ${statusCode} ${text.slice(0, 200)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Orthogonal returned non-JSON: ${text.slice(0, 200)}`);
  }
  if (!isObject(parsed)) {
    throw new Error("Orthogonal response was not an object");
  }
  const data = parsed.data;
  if (!isObject(data)) {
    throw new Error(`Orthogonal response missing data object: ${text.slice(0, 200)}`);
  }
  const tweetsRaw = data.tweets;
  if (!Array.isArray(tweetsRaw)) {
    // Some handles may legitimately return no tweets — treat as empty.
    cacheSet(key, [], ttlSeconds);
    return [];
  }
  const tweets: OrthogonalTweet[] = [];
  for (const raw of tweetsRaw) {
    const t = coerceTweet(raw);
    if (t) tweets.push(t);
  }
  cacheSet(key, tweets, ttlSeconds);
  return tweets;
}

export const xOrthogonalPlatform: Platform = {
  name: "x",
  isEnabled(config) {
    return !!config.orthogonal_api_key && config.x_profiles.length > 0;
  },
  async fetch(query: FetchQuery, config: Config): Promise<Post[]> {
    const apiKey = config.orthogonal_api_key;
    if (!apiKey) {
      throw new Error("ORTHOGONAL_API_KEY is required for the x platform");
    }
    const profiles =
      query.x_profiles && query.x_profiles.length > 0 ? query.x_profiles : config.x_profiles;
    if (profiles.length === 0) return [];

    const { start, end } = durationToRange(query.since);
    const seen = new Set<string>();
    const posts: Post[] = [];

    // Fan out per-handle in parallel — each is its own paid call.
    const results = await Promise.allSettled(
      profiles.map((handle) =>
        fetchTweetsForHandle(apiKey, handle, config.cache_ttl_seconds).then((tweets) => ({
          handle: cleanHandle(handle),
          tweets,
        })),
      ),
    );

    const errors: string[] = [];
    for (const r of results) {
      if (r.status === "rejected") {
        const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
        errors.push(reason);
        continue;
      }
      const { handle, tweets } = r.value;
      for (const tweet of tweets) {
        const post = normalizeTweet(tweet, handle);
        if (!post) continue;
        if (seen.has(post.id)) continue;
        const posted = new Date(post.posted_at).getTime();
        if (Number.isFinite(posted) && (posted < start.getTime() || posted > end.getTime())) {
          continue;
        }
        seen.add(post.id);
        posts.push(post);
      }
    }

    // If every handle failed, surface the first error so callers know X is broken.
    if (posts.length === 0 && errors.length > 0 && errors.length === results.length) {
      throw new Error(errors[0] ?? "Orthogonal request failed");
    }

    posts.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const limit = query.per_source_limit ?? config.per_source_limit;
    if (limit > 0 && posts.length > limit) return posts.slice(0, limit);
    return posts;
  },
};
