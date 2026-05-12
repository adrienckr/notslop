import { describe, expect, it, vi } from "vitest";

const mockEmbedTexts = vi.hoisted(() => vi.fn());
vi.mock("../../src/embed/zeroentropy.js", () => ({ embedTexts: mockEmbedTexts }));

import { clusterPosts } from "../../src/embed/cluster.js";
import type { Config, Post } from "../../src/types.js";
import { DEFAULT_CONFIG } from "../../src/types.js";

const config: Config = { ...DEFAULT_CONFIG, zeroentropy_api_key: "test" };

function p(id: string, title: string, score = 0): Post {
  return {
    id,
    source: "reddit",
    title,
    text: title,
    posted_at: "2026-05-11T00:00:00Z",
    url: `https://r/x/${id}`,
    score,
  };
}

describe("clusterPosts", () => {
  it("returns one cluster per post when all are orthogonal", async () => {
    const posts = [p("a", "Cats"), p("b", "Dogs"), p("c", "Plants")];
    mockEmbedTexts.mockResolvedValueOnce([
      new Float32Array([1, 0, 0]),
      new Float32Array([0, 1, 0]),
      new Float32Array([0, 0, 1]),
    ]);
    const clusters = await clusterPosts(posts, config, { mergeThreshold: 0.7 });
    expect(clusters.length).toBe(3);
  });

  it("merges similar posts into one cluster", async () => {
    const posts = [
      p("a", "Claude 4.5 ships today", 100),
      p("b", "Anthropic releases Claude 4.5", 50),
      p("c", "Unrelated cat post", 10),
    ];
    mockEmbedTexts.mockResolvedValueOnce([
      new Float32Array([0.9, 0.4, 0]),
      new Float32Array([0.85, 0.45, 0]),
      new Float32Array([0, 0, 1]),
    ]);
    const clusters = await clusterPosts(posts, config, { mergeThreshold: 0.7 });
    expect(clusters.length).toBe(2);
    const big = clusters.find((c) => c.members.length === 2);
    expect(big).toBeDefined();
    expect(big!.label).toBe("Claude 4.5 ships today");
  });

  it("returns empty for empty input", async () => {
    const clusters = await clusterPosts([], config);
    expect(clusters).toEqual([]);
  });
});
