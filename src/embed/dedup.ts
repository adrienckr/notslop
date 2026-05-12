/**
 * Cross-source deduplication. The same news item often appears on Reddit + HN
 * + blogs simultaneously; without dedup the digest serves the same content
 * three times. We embed every post, walk pairwise, and collapse pairs above a
 * configurable cosine threshold.
 *
 * Tie-breaker for which version we keep: highest engagement score (with
 * fallback to longest body text). Reddit upvotes, HN points, X likes — all
 * stored in `Post.score`.
 */

import type { Config, DuplicatePair, Post } from "../types.js";
import { cosineSimilarity } from "./cosine.js";
import { embedTexts } from "./zeroentropy.js";

export interface DedupOptions {
  /** Cosine threshold above which posts are considered duplicates. Default 0.85. */
  threshold?: number;
}

export interface DedupResult {
  kept: Post[];
  dropped: Post[];
  pairs: DuplicatePair[];
}

function engagement(p: Post): number {
  return (p.score ?? 0) * 1000 + p.text.length;
}

function buildDoc(p: Post): string {
  return `${p.title}\n${p.text}`;
}

export async function dedupPosts(
  posts: Post[],
  config: Config,
  options: DedupOptions = {},
): Promise<DedupResult> {
  if (posts.length <= 1) {
    return { kept: [...posts], dropped: [], pairs: [] };
  }

  const threshold = options.threshold ?? 0.85;
  const vectors = await embedTexts(posts.map(buildDoc), config, { inputType: "document" });

  const dropped = new Set<number>();
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < posts.length; i++) {
    if (dropped.has(i)) continue;
    for (let j = i + 1; j < posts.length; j++) {
      if (dropped.has(j)) continue;
      const sim = cosineSimilarity(vectors[i]!, vectors[j]!);
      if (sim >= threshold) {
        if (engagement(posts[j]!) > engagement(posts[i]!)) {
          dropped.add(i);
          pairs.push({ kept: posts[j]!, dropped: posts[i]!, similarity: sim });
          break;
        }
        dropped.add(j);
        pairs.push({ kept: posts[i]!, dropped: posts[j]!, similarity: sim });
      }
    }
  }

  const kept: Post[] = [];
  const droppedPosts: Post[] = [];
  for (let i = 0; i < posts.length; i++) {
    if (dropped.has(i)) droppedPosts.push(posts[i]!);
    else kept.push(posts[i]!);
  }
  return { kept, dropped: droppedPosts, pairs };
}
