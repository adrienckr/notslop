/**
 * Thin client for `notslop-api` — the hosted scraping gateway.
 *
 * When the CLI is invoked with `--api <url> --api-key <key>` (or the matching
 * env vars `NOTSLOP_API_URL` / `NOTSLOP_API_KEY` are set), `fetchAll` swaps
 * the local platform fan-out for a single round-trip to `/v1/feed`. The rest
 * of the pipeline (rerank, dedup, output) is unchanged — ZE still runs on the
 * user's own key, BYOK style.
 */

import { request } from "undici";

import type { FetchQuery, Post } from "./types.js";

interface FeedResponse {
  posts: unknown;
}

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export interface ApiCreds {
  url: string;
  key: string;
}

/**
 * Resolve api creds from explicit flags (preferred) or env vars (fallback).
 * Returns `undefined` when neither is set — caller falls back to local fetch.
 */
export function resolveApiCreds(flagUrl?: string, flagKey?: string): ApiCreds | undefined {
  const url = flagUrl ?? readEnv("NOTSLOP_API_URL");
  const key = flagKey ?? readEnv("NOTSLOP_API_KEY");
  if (!url || !key) return undefined;
  return { url: url.replace(/\/$/, ""), key };
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

/**
 * Fetch posts from notslop-api `/v1/feed`. Maps `query` to the equivalent
 * query-string params. Errors surface to caller — the CLI prints them and
 * exits with status 1.
 */
export async function fetchFromApi(query: FetchQuery, creds: ApiCreds): Promise<Post[]> {
  const params = new URLSearchParams();
  if (query.query && query.query.length > 0) params.set("topic", query.query);
  if (query.since) params.set("since", query.since);
  if (query.per_source_limit)
    params.set("limit", String(Math.max(1, Math.min(200, query.per_source_limit))));

  const url = `${creds.url}/v1/feed?${params.toString()}`;
  const { statusCode, body } = await request(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${creds.key}`,
      accept: "application/json",
    },
  });

  if (statusCode === 401) {
    throw new Error("notslop-api auth failed — check --api-key (or NOTSLOP_API_KEY env)");
  }
  if (statusCode < 200 || statusCode >= 300) {
    const text = await body.text().catch(() => "");
    throw new Error(`notslop-api fetch failed: HTTP ${statusCode} ${text.slice(0, 200)}`);
  }

  const parsed = (await body.json()) as FeedResponse;
  if (!parsed || !Array.isArray(parsed.posts)) {
    throw new Error("notslop-api returned unexpected payload (missing posts[])");
  }
  return parsed.posts.filter(isPost);
}
