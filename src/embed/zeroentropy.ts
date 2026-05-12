/**
 * ZeroEntropy embed wrapper. Mirrors the rerank module's shape.
 *
 * Cache layer is permanent (embeddings are deterministic for a given
 * model+text), backed by SQLite. We batch cache misses into a single HTTP call
 * to minimize ZE token cost.
 */

import { createHash } from "node:crypto";

import { request } from "undici";

import type { Config } from "../types.js";
import { embedCacheGet, embedCacheSet } from "./cache.js";

// Override base URL via `ZEROENTROPY_BASE_URL` or just the embed endpoint via
// `ZEROENTROPY_EMBED_URL` if the embed path differs from the convention.
const ZE_BASE_URL = process.env.ZEROENTROPY_BASE_URL ?? "https://api.zeroentropy.dev/v1";
const EMBED_ENDPOINT = process.env.ZEROENTROPY_EMBED_URL ?? `${ZE_BASE_URL}/models/embed`;
const DEFAULT_MODEL = "zembed-1";
const DOC_CHAR_LIMIT = 2000;

interface EmbedOptions {
  model?: string;
  inputType?: "query" | "document";
}

interface EmbedResponseBody {
  embeddings: number[][];
}

function textHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function truncate(text: string): string {
  return text.length > DOC_CHAR_LIMIT ? text.slice(0, DOC_CHAR_LIMIT) : text;
}

/**
 * Embed an array of texts. Returns vectors in the same order as inputs.
 *
 * Cached results are returned immediately. Cache misses are batched into a
 * single ZE call. The result is written back to cache.
 */
export async function embedTexts(
  texts: string[],
  config: Config,
  options?: EmbedOptions,
): Promise<Float32Array[]> {
  if (texts.length === 0) return [];

  const apiKey = config.zeroentropy_api_key;
  if (!apiKey) {
    throw new Error(
      "ZEROENTROPY_API_KEY not set — get one free at https://dashboard.zeroentropy.dev",
    );
  }

  const model = options?.model ?? DEFAULT_MODEL;
  const inputType = options?.inputType ?? "document";

  // Pass 1: figure out hits vs misses.
  const hashes = texts.map((t) => textHash(truncate(t)));
  const results: (Float32Array | null)[] = hashes.map((h) => embedCacheGet(h, model));

  const missIndices: number[] = [];
  const missTexts: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    if (results[i] === null) {
      missIndices.push(i);
      missTexts.push(truncate(texts[i]!));
    }
  }

  // No misses → done.
  if (missTexts.length === 0) {
    return results.map((r) => r as Float32Array);
  }

  // Pass 2: single batched call for the misses.
  const body = JSON.stringify({
    model,
    inputs: missTexts,
    input_type: inputType,
  });

  const { statusCode, body: resBody } = await request(EMBED_ENDPOINT, {
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
    throw new Error(`ZeroEntropy embed failed: HTTP ${statusCode}`);
  }

  const parsed = (await resBody.json()) as EmbedResponseBody;
  const fresh = Array.isArray(parsed?.embeddings) ? parsed.embeddings : [];
  if (fresh.length !== missTexts.length) {
    throw new Error(
      `ZeroEntropy embed returned ${fresh.length} vectors for ${missTexts.length} inputs`,
    );
  }

  // Pass 3: write misses to cache + fill into the results array.
  for (let i = 0; i < missIndices.length; i++) {
    const idx = missIndices[i]!;
    const vec = new Float32Array(fresh[i]!);
    embedCacheSet(hashes[idx]!, model, vec);
    results[idx] = vec;
  }

  return results.map((r, i) => {
    if (r === null) {
      throw new Error(`internal: result at index ${i} was not filled`);
    }
    return r;
  });
}
