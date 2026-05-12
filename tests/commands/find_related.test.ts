import { describe, expect, it, vi } from "vitest";

const mockEmbedTexts = vi.hoisted(() => vi.fn());
vi.mock("../../src/embed/zeroentropy.js", () => ({ embedTexts: mockEmbedTexts }));

import { findRelatedFromText } from "../../src/commands/find_related.js";
import type { Config, Post } from "../../src/types.js";
import { DEFAULT_CONFIG } from "../../src/types.js";

const config: Config = { ...DEFAULT_CONFIG, zeroentropy_api_key: "test" };

function p(id: string, title: string): Post {
  return {
    id,
    source: "reddit",
    title,
    text: title,
    posted_at: "2026-05-11T00:00:00Z",
    url: `https://r/x/${id}`,
  };
}

describe("findRelatedFromText", () => {
  it("returns posts ranked by cosine similarity to the input", async () => {
    const candidates = [p("a", "Claude 4.5 ships"), p("b", "Cats"), p("c", "Claude 4.5 review")];
    mockEmbedTexts.mockImplementationOnce(async (texts: string[]) => {
      return texts.map((t) => {
        if (t.includes("Claude")) return new Float32Array([0.9, 0.1, 0]);
        if (t === "Cats") return new Float32Array([0, 0.1, 0.9]);
        return new Float32Array([0.5, 0.5, 0]);
      });
    });
    const out = await findRelatedFromText("What's new with Claude 4.5?", candidates, config, {
      top: 2,
    });
    expect(out.length).toBe(2);
    expect(out[0]!.post.title).toMatch(/Claude/);
    expect(out[0]!.similarity).toBeGreaterThan(0.5);
  });

  it("returns empty when candidates is empty", async () => {
    const out = await findRelatedFromText("anything", [], config);
    expect(out).toEqual([]);
  });
});
