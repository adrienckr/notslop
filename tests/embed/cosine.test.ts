import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "../../src/embed/cosine.js";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const a = new Float32Array([1, 0, 0]);
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([0, 1]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("returns -1 for opposite vectors", () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([-1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it("is invariant to magnitude", () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([5, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it("throws on dim mismatch", () => {
    const a = new Float32Array([1, 2]);
    const b = new Float32Array([1, 2, 3]);
    expect(() => cosineSimilarity(a, b)).toThrow(/dim mismatch/);
  });

  it("returns 0 when either vector is all zeros", () => {
    const a = new Float32Array([0, 0, 0]);
    const b = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});
