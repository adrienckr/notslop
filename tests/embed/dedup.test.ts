import { describe, expect, it, vi } from "vitest";

import { dedupPosts } from "../../src/embed/dedup.js";
import type { Config, Post } from "../../src/types.js";
import { DEFAULT_CONFIG } from "../../src/types.js";

const config: Config = { ...DEFAULT_CONFIG, zeroentropy_api_key: "test" };

function p(id: string, source: Post["source"], title: string, score = 0): Post {
  return {
    id,
    source,
    title,
    text: title,
    posted_at: "2026-05-11T00:00:00Z",
    url: `https://example.com/${id}`,
    score,
  };
}

// Hoist the mock fn so vitest processes it before ESM imports are evaluated.
const mockEmbedTexts = vi.hoisted(() => vi.fn());

vi.mock("../../src/embed/zeroentropy.js", () => ({
  embedTexts: mockEmbedTexts,
}));

describe("dedupPosts", () => {
  it("returns unchanged when posts are all distinct", async () => {
    mockEmbedTexts.mockResolvedValueOnce([new Float32Array([1, 0]), new Float32Array([0, 1])]);
    const posts = [p("a", "reddit", "Cats"), p("b", "hn", "Dogs")];
    const { kept, dropped } = await dedupPosts(posts, config, { threshold: 0.85 });
    expect(kept.length).toBe(2);
    expect(dropped.length).toBe(0);
  });

  it("collapses near-duplicates and keeps the one with higher engagement", async () => {
    mockEmbedTexts.mockResolvedValueOnce([
      new Float32Array([0.9, 0.1, 0]),
      new Float32Array([0.85, 0.15, 0]),
      new Float32Array([0, 0, 1]),
    ]);
    const posts = [
      p("a", "reddit", "Claude 4.5 ships", 100),
      p("b", "hn", "Claude 4.5 release", 500),
      p("c", "blogs", "Unrelated story", 0),
    ];
    const { kept, dropped, pairs } = await dedupPosts(posts, config, { threshold: 0.85 });
    expect(kept.length).toBe(2);
    expect(dropped.length).toBe(1);
    expect(kept.some((k) => k.id === "b")).toBe(true);
    expect(dropped[0]!.id).toBe("a");
    expect(pairs.length).toBe(1);
    expect(pairs[0]!.similarity).toBeGreaterThan(0.85);
  });

  it("returns empty for empty input", async () => {
    const { kept, dropped } = await dedupPosts([], config);
    expect(kept).toEqual([]);
    expect(dropped).toEqual([]);
  });
});
