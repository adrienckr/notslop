/**
 * Agglomerative clustering for theme detection. We start with each post in
 * its own cluster, then repeatedly merge the two most similar clusters until
 * no remaining pair exceeds the merge threshold.
 *
 * Similarity between clusters = cosine of their centroids (Float32Array
 * average over members' vectors).
 *
 * Complexity: O(n³) worst case. For pulse-sized n (≤ 200) this is ~ms.
 */

import { cosineSimilarity } from "./cosine.js";
import { embedTexts } from "./zeroentropy.js";
import type { Config, Post, PostCluster } from "../types.js";

export interface ClusterOptions {
  /** Cosine threshold above which two clusters are merged. Default 0.72. */
  mergeThreshold?: number;
  /** Cap on the number of clusters returned (most-populated first). Default unlimited. */
  maxClusters?: number;
}

interface InternalCluster {
  ids: number[];
  centroid: Float32Array;
}

function buildDoc(p: Post): string {
  return `${p.title}\n${p.text}`;
}

function average(vectors: Float32Array[]): Float32Array {
  const dim = vectors[0]!.length;
  const out = new Float32Array(dim);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) out[i]! += v[i]!;
  }
  for (let i = 0; i < dim; i++) out[i]! /= vectors.length;
  return out;
}

function engagement(p: Post): number {
  return (p.score ?? 0) * 1000 + p.text.length;
}

export async function clusterPosts(
  posts: Post[],
  config: Config,
  options: ClusterOptions = {},
): Promise<PostCluster[]> {
  if (posts.length === 0) return [];
  const threshold = options.mergeThreshold ?? 0.72;
  const vectors = await embedTexts(posts.map(buildDoc), config, { inputType: "document" });

  let clusters: InternalCluster[] = vectors.map((v, i) => ({ ids: [i], centroid: v }));

  while (clusters.length > 1) {
    let bestI = -1;
    let bestJ = -1;
    let bestSim = -1;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const sim = cosineSimilarity(clusters[i]!.centroid, clusters[j]!.centroid);
        if (sim > bestSim) {
          bestSim = sim;
          bestI = i;
          bestJ = j;
        }
      }
    }
    if (bestSim < threshold) break;
    const a = clusters[bestI]!;
    const b = clusters[bestJ]!;
    const mergedIds = [...a.ids, ...b.ids];
    const mergedCentroid = average(mergedIds.map((idx) => vectors[idx]!));
    const next: InternalCluster[] = [];
    for (let k = 0; k < clusters.length; k++) {
      if (k === bestI) next.push({ ids: mergedIds, centroid: mergedCentroid });
      else if (k === bestJ) continue;
      else next.push(clusters[k]!);
    }
    clusters = next;
  }

  const out: PostCluster[] = clusters.map((c) => {
    const members = c.ids
      .map((i) => posts[i]!)
      .sort((x, y) => engagement(y) - engagement(x));
    let pairSum = 0;
    let pairCount = 0;
    for (let i = 0; i < c.ids.length; i++) {
      for (let j = i + 1; j < c.ids.length; j++) {
        pairSum += cosineSimilarity(vectors[c.ids[i]!]!, vectors[c.ids[j]!]!);
        pairCount++;
      }
    }
    const cohesion = pairCount > 0 ? pairSum / pairCount : 1;
    return { label: members[0]!.title, members, cohesion };
  });

  out.sort((a, b) => b.members.length - a.members.length);
  return options.maxClusters ? out.slice(0, options.maxClusters) : out;
}
