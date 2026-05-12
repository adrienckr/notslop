/**
 * `notslop find-related <url-or-text>` — given an input (URL to fetch, or
 * literal text), embed it, fetch recent posts across enabled sources, and
 * return the top N most semantically similar posts.
 *
 * Use case: repurpose flow. The user has a draft (or an existing post), and
 * wants to find recent related discussions to ground the rewrite in.
 */

import { request } from "undici";

import { cosineSimilarity } from "../embed/cosine.js";
import { embedTexts } from "../embed/zeroentropy.js";
import type { Config, FetchQuery, Post, RelatedPost } from "../types.js";

export interface FindRelatedOptions {
  top?: number;
}

function buildDoc(p: Post): string {
  return `${p.title}\n${p.text}`;
}

/** Pure logic: given an input string and a candidate set, rank by similarity. */
export async function findRelatedFromText(
  input: string,
  candidates: Post[],
  config: Config,
  options: FindRelatedOptions = {},
): Promise<RelatedPost[]> {
  if (candidates.length === 0) return [];
  const top = options.top ?? 10;
  const allTexts = [input, ...candidates.map(buildDoc)];
  const vectors = await embedTexts(allTexts, config, { inputType: "query" });
  const inputVec = vectors[0]!;
  const candidateVectors = vectors.slice(1);
  const scored = candidates.map((post, i) => ({
    post,
    similarity: cosineSimilarity(inputVec, candidateVectors[i]!),
  }));
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, top).map((s, i) => ({ ...s, rank: i + 1 }));
}

/** If the user passed a URL, fetch + extract text. Otherwise return as-is. */
export async function resolveInput(rawInput: string): Promise<string> {
  const trimmed = rawInput.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed;
  }
  const { statusCode, body } = await request(trimmed, {
    method: "GET",
    headers: { "User-Agent": "notslop/0.3" },
  });
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`failed to fetch input URL: HTTP ${statusCode}`);
  }
  const text = await body.text();
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

/** Full command: resolve input, fan-out fetch, embed, rank, return. */
export async function findRelatedCommand(
  rawInput: string,
  fetchCandidates: (q: FetchQuery, c: Config) => Promise<Post[]>,
  config: Config,
  options: FindRelatedOptions & { since?: string },
): Promise<RelatedPost[]> {
  const resolved = await resolveInput(rawInput);
  const candidates = await fetchCandidates(
    {
      query: resolved.slice(0, 200),
      since: (options.since as FetchQuery["since"]) ?? "7d",
      per_source_limit: 50,
    },
    config,
  );
  return findRelatedFromText(resolved, candidates, config, options);
}
