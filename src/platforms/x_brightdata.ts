/**
 * X (Twitter) via Bright Data Datasets API.
 *
 * Bright Data exposes pre-built scrapers as datasets. We trigger a snapshot
 * for the user's configured `x_profiles`, poll until it is ready, then
 * normalize each tweet record into a `Post`.
 *
 * NOTE: The Bright Data dataset_id used here is a placeholder. Set the
 * `BRIGHTDATA_DATASET_ID` env var to override, or replace the constant
 * `DEFAULT_DATASET_ID` in this file with the id from your Bright Data
 * dashboard (X — Posts by array of profiles).
 */

import { request } from "undici";

import { cacheGet, cacheKey, cacheSet } from "../cache.js";
import type { Config, FetchQuery, Post } from "../types.js";
import { type Platform, durationToRange, truncateText } from "./_base.js";

// TODO: confirm the real dataset id from your Bright Data dashboard.
const DEFAULT_DATASET_ID = "gd_lwxkxvnf1cynvib9co";

const TRIGGER_BASE = "https://api.brightdata.com/datasets/v3/trigger";
const SNAPSHOT_BASE = "https://api.brightdata.com/datasets/v3/snapshot";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60_000;

function datasetId(): string {
  return process.env.BRIGHTDATA_DATASET_ID ?? DEFAULT_DATASET_ID;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "social-context/0.1",
    Accept: "application/json",
  };
}

interface TriggerResponse {
  snapshot_id?: string;
}

interface BrightDataTweet {
  id?: string;
  user_posted?: string;
  description?: string;
  date_posted?: string;
  url?: string;
  likes?: number;
  reposts?: number;
  replies?: number;
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

function coerceTweet(raw: unknown): BrightDataTweet | null {
  if (!isObject(raw)) return null;
  return {
    id: readString(raw, "id"),
    user_posted: readString(raw, "user_posted"),
    description: readString(raw, "description"),
    date_posted: readString(raw, "date_posted"),
    url: readString(raw, "url"),
    likes: readNumber(raw, "likes"),
    reposts: readNumber(raw, "reposts"),
    replies: readNumber(raw, "replies"),
  };
}

function buildTitle(description: string): string {
  const text = description.replace(/\s+/g, " ").trim();
  if (text.length <= 100) return text;
  return `${text.slice(0, 100)}…`;
}

function parseDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function tweetToPost(tweet: BrightDataTweet): Post | null {
  if (!tweet.id || !tweet.description || !tweet.url) return null;
  const postedAt = parseDate(tweet.date_posted) ?? new Date().toISOString();
  const handle = tweet.user_posted ?? "";
  return {
    id: `x_${tweet.id}`,
    source: "x",
    sub_source: handle ? `@${handle}` : undefined,
    title: buildTitle(tweet.description),
    text: truncateText(tweet.description),
    author: handle || undefined,
    posted_at: postedAt,
    url: tweet.url,
    score: tweet.likes,
    comments: tweet.replies,
  };
}

function matchesQueryTerms(description: string, query: string): boolean {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (terms.length === 0) return true;
  const haystack = description.toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

async function triggerSnapshot(apiKey: string, urls: string[]): Promise<string> {
  const triggerUrl = `${TRIGGER_BASE}?dataset_id=${encodeURIComponent(datasetId())}`;
  const { statusCode, body } = await request(triggerUrl, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ input: urls.map((url) => ({ url })) }),
  });
  const text = await body.text();

  if (statusCode === 401) {
    throw new Error("Bright Data auth failed — check BRIGHTDATA_API_KEY");
  }
  if (statusCode === 402 || statusCode === 429) {
    throw new Error("Bright Data quota/rate limit hit — see https://brightdata.com/cp");
  }
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Bright Data trigger failed: HTTP ${statusCode} ${text.slice(0, 200)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Bright Data trigger returned non-JSON response: ${text.slice(0, 200)}`);
  }
  if (!isObject(parsed)) {
    throw new Error("Bright Data trigger response was not an object");
  }
  const snapshotId = (parsed as TriggerResponse).snapshot_id;
  if (typeof snapshotId !== "string" || !snapshotId) {
    throw new Error("Bright Data trigger response missing snapshot_id");
  }
  return snapshotId;
}

async function pollSnapshot(apiKey: string, snapshotId: string): Promise<BrightDataTweet[]> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  const url = `${SNAPSHOT_BASE}/${encodeURIComponent(snapshotId)}?format=json`;

  while (Date.now() < deadline) {
    const { statusCode, body } = await request(url, {
      method: "GET",
      headers: authHeaders(apiKey),
    });
    const text = await body.text();

    if (statusCode === 401) {
      throw new Error("Bright Data auth failed — check BRIGHTDATA_API_KEY");
    }
    if (statusCode === 402 || statusCode === 429) {
      throw new Error("Bright Data quota/rate limit hit — see https://brightdata.com/cp");
    }

    // 202 (or similar pending statuses) means data still building — keep polling.
    if (statusCode === 202) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (statusCode >= 200 && statusCode < 300) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Not JSON yet — keep polling.
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      // Pending body shapes: {"status": "running"} / {"status": "building"} etc.
      if (isObject(parsed)) {
        const status = readString(parsed, "status");
        if (status && status !== "ready") {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }
      }

      if (Array.isArray(parsed)) {
        const tweets: BrightDataTweet[] = [];
        for (const raw of parsed) {
          const tweet = coerceTweet(raw);
          if (tweet) tweets.push(tweet);
        }
        return tweets;
      }

      // Unknown success shape — treat as empty and bail.
      return [];
    }

    throw new Error(`Bright Data snapshot fetch failed: HTTP ${statusCode} ${text.slice(0, 200)}`);
  }

  throw new Error("Bright Data snapshot did not complete within 60s");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTweetsForProfiles(
  profiles: string[],
  config: Config,
): Promise<BrightDataTweet[]> {
  const apiKey = config.brightdata_api_key;
  if (!apiKey) {
    throw new Error("BRIGHTDATA_API_KEY is required for the x platform");
  }

  const sortedProfiles = [...profiles].sort();
  const key = cacheKey("x_brightdata", sortedProfiles.join(","));
  const cached = cacheGet<BrightDataTweet[]>(key);
  if (cached) return cached;

  const urls = sortedProfiles.map((handle) => {
    const clean = handle.replace(/^@/, "");
    return `https://x.com/${clean}`;
  });

  const snapshotId = await triggerSnapshot(apiKey, urls);
  const tweets = await pollSnapshot(apiKey, snapshotId);
  cacheSet(key, tweets, config.cache_ttl_seconds);
  return tweets;
}

export const xBrightdataPlatform: Platform = {
  name: "x",
  isEnabled(config) {
    return !!config.brightdata_api_key && config.x_profiles.length > 0;
  },
  async fetch(query: FetchQuery, config: Config): Promise<Post[]> {
    const profiles =
      query.x_profiles && query.x_profiles.length > 0 ? query.x_profiles : config.x_profiles;
    if (profiles.length === 0) return [];

    const tweets = await fetchTweetsForProfiles(profiles, config);
    const { start, end } = durationToRange(query.since);

    const seen = new Set<string>();
    const posts: Post[] = [];
    for (const tweet of tweets) {
      if (query.query && tweet.description && !matchesQueryTerms(tweet.description, query.query)) {
        continue;
      }
      const post = tweetToPost(tweet);
      if (!post) continue;
      if (seen.has(post.id)) continue;
      const posted = new Date(post.posted_at).getTime();
      if (Number.isFinite(posted) && (posted < start.getTime() || posted > end.getTime())) {
        continue;
      }
      seen.add(post.id);
      posts.push(post);
    }

    posts.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const limit = query.per_source_limit ?? config.per_source_limit;
    if (limit > 0 && posts.length > limit) return posts.slice(0, limit);
    return posts;
  },
};
