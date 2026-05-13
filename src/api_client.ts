/**
 * Thin client for `notslop-api` — the hosted (or self-hosted) scraping gateway.
 *
 * When the CLI is invoked with `--api <url>` (or the env var `NOTSLOP_API_URL`
 * is set), `fetchAll` swaps the local platform fan-out for a single round-trip
 * to `POST /v1/scrape`. The CLI sends its local config (subreddits, X handles,
 * blog URLs, Bright Data creds) in the body — the server is stateless and
 * stores nothing about the caller. The rest of the pipeline (rerank, dedup,
 * output) is unchanged — ZE still runs locally on the user's own key.
 */

import { request } from "undici";

import type { Config, FetchQuery, Post } from "./types.js";

interface ScrapeResponse {
  posts: unknown;
}

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export interface ApiTarget {
  url: string;
}

/**
 * Resolve api target from explicit flag (preferred) or env var (fallback).
 * Returns `undefined` when neither is set — caller falls back to local fetch.
 *
 * Note: as of notslop-api v0.2 the gateway is stateless and accepts
 * unauthenticated calls. No bearer token is required. `--api-key` is accepted
 * for backwards compatibility but ignored.
 */
export function resolveApiTarget(flagUrl?: string): ApiTarget | undefined {
  const url = flagUrl ?? readEnv("NOTSLOP_API_URL");
  if (!url) return undefined;
  return { url: url.replace(/\/$/, "") };
}

function isPost(value: unknown): value is Post {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.source === "string" &&
    typeof v.title === "string" &&
    typeof v.text === "string" &&
    typeof v.posted_at === "string" &&
    typeof v.url === "string"
  );
}

interface ScrapeBody {
  topic?: string;
  since?: string;
  limit?: number;
  sources: {
    reddit?: string[];
    blogs?: string[];
    x?: string[];
    hn: boolean;
  };
  creds?: {
    brightdata?: { api_key: string; dataset_id: string };
  };
}

/**
 * POST /v1/scrape with the caller's local config in the body. Stateless on
 * the server side — every request stands alone.
 */
export async function fetchFromApi(
  query: FetchQuery,
  config: Config,
  target: ApiTarget,
): Promise<Post[]> {
  const subreddits = query.subreddits ?? config.subreddits ?? [];
  const blogs = query.blog_urls ?? config.blogs ?? [];
  const x_handles = query.x_profiles ?? config.x_profiles ?? [];

  const body: ScrapeBody = {
    sources: {
      reddit: subreddits.length > 0 ? subreddits : undefined,
      blogs: blogs.length > 0 ? blogs : undefined,
      x: x_handles.length > 0 ? x_handles : undefined,
      hn: true,
    },
  };

  if (query.query && query.query.length > 0) body.topic = query.query;
  if (query.since) body.since = query.since;
  if (query.per_source_limit) {
    body.limit = Math.max(1, Math.min(200, query.per_source_limit));
  }

  // BYOK: if the user has a Bright Data key configured locally and wants X,
  // forward the creds inside the body. The server forgets them after the call.
  const bdKey = config.brightdata_api_key;
  const bdDataset =
    config.brightdata_dataset_id ??
    readEnv("BRIGHTDATA_DATASET_ID") ??
    readEnv("BRIGHTDATA_DATASET_ID_X_POSTS");
  if (x_handles.length > 0 && bdKey && bdDataset) {
    body.creds = { brightdata: { api_key: bdKey, dataset_id: bdDataset } };
  }

  const url = `${target.url}/v1/scrape`;
  const { statusCode, body: resBody } = await request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (statusCode === 429) {
    const text = await resBody.text().catch(() => "");
    throw new Error(
      `notslop-api rate-limited: ${text.slice(0, 200)} — provide your own Bright Data key to skip the hosted quota`,
    );
  }
  if (statusCode < 200 || statusCode >= 300) {
    const text = await resBody.text().catch(() => "");
    throw new Error(`notslop-api fetch failed: HTTP ${statusCode} ${text.slice(0, 200)}`);
  }

  const parsed = (await resBody.json()) as ScrapeResponse;
  if (!parsed || !Array.isArray(parsed.posts)) {
    throw new Error("notslop-api returned unexpected payload (missing posts[])");
  }
  return parsed.posts.filter(isPost);
}
