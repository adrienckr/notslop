/**
 * ZeroEntropy rerank wrapper.
 *
 * Takes a flat list of posts gathered from every source and reorders them by
 * semantic relevance to the user's query via the ZE `/v1/models/rerank`
 * endpoint. Results are cached locally per (query, doc-set) so repeat invocations
 * within the TTL window are free.
 */

import { createHash } from "node:crypto";
import { request } from "undici";

import { cacheGet, cacheKey, cacheSet } from "../cache.js";
import type { Config, Post, RankedPost } from "../types.js";

// Override via `ZEROENTROPY_BASE_URL` env var if ZE moves their API or you proxy it.
const ZE_BASE_URL = process.env.ZEROENTROPY_BASE_URL ?? "https://api.zeroentropy.com/v1";
const RERANK_ENDPOINT = `${ZE_BASE_URL}/models/rerank`;
const DEFAULT_MODEL = "zerank-2";
const DEFAULT_TOP_N = 10;
const DOC_CHAR_LIMIT = 2000;

interface RerankResultEntry {
  index: number;
  relevance_score: number;
}

interface RerankResponseBody {
  results: RerankResultEntry[];
}

/** Hash a single document to keep the cache key compact. */
function docHash(doc: string): string {
  return createHash("sha256").update(doc).digest("hex");
}

/** Cap a document to the configured char ceiling without exploding multibyte chars. */
function truncateDoc(doc: string): string {
  return doc.length > DOC_CHAR_LIMIT ? doc.slice(0, DOC_CHAR_LIMIT) : doc;
}

/** Build the doc string ZE will embed — title on first line, body below. */
function buildDoc(post: Post): string {
  return truncateDoc(`${post.title}\n${post.text}`);
}

export async function rerank(
  posts: Post[],
  query: string,
  config: Config,
  options?: { topN?: number; model?: string },
): Promise<RankedPost[]> {
  if (posts.length === 0) return [];

  const apiKey = config.zeroentropy_api_key;
  if (!apiKey) {
    throw new Error(
      "ZEROENTROPY_API_KEY not set — get one free at https://dashboard.zeroentropy.dev",
    );
  }

  const documents = posts.map(buildDoc);
  const topN = options?.topN ?? DEFAULT_TOP_N;
  const model = options?.model ?? DEFAULT_MODEL;

  // Cache key folds the query + doc hashes + top_n + model so a different ask
  // doesn't collide with a stale entry.
  const fingerprint = createHash("sha256")
    .update(`${model}|${topN}|${query}|${documents.map(docHash).join(",")}`)
    .digest("hex");
  const key = cacheKey("ze-rerank", fingerprint);

  const cached = cacheGet<RankedPost[]>(key);
  if (cached) return cached;

  const body = JSON.stringify({
    model,
    query,
    documents,
    top_n: topN,
  });

  const { statusCode, body: resBody } = await request(RERANK_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body,
  });

  if (statusCode === 401) {
    throw new Error(
      "ZeroEntropy auth failed — check ZEROENTROPY_API_KEY at dashboard.zeroentropy.dev",
    );
  }
  if (statusCode === 429) {
    throw new Error("ZeroEntropy rate limit hit — see dashboard for quota");
  }
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`ZeroEntropy rerank failed: HTTP ${statusCode}`);
  }

  const parsed = (await resBody.json()) as RerankResponseBody;
  const results = Array.isArray(parsed?.results) ? parsed.results : [];

  // Defensive sort — ZE returns sorted but we don't want to depend on it.
  const sorted = [...results].sort((a, b) => b.relevance_score - a.relevance_score);

  const ranked: RankedPost[] = sorted
    .filter((r) => r.index >= 0 && r.index < posts.length)
    .map((r, i) => ({
      post: posts[r.index]!,
      ze_score: r.relevance_score,
      rank: i + 1,
    }));

  cacheSet(key, ranked, config.cache_ttl_seconds);
  return ranked;
}
