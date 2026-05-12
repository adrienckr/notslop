import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  embedCacheClear,
  embedCacheClose,
  embedCacheGet,
  embedCacheSet,
} from "../../src/embed/cache.js";

describe("embed cache", () => {
  beforeEach(() => {
    embedCacheClear();
  });
  afterEach(() => {
    embedCacheClose();
  });

  it("stores and retrieves a vector verbatim", () => {
    const vec = new Float32Array([0.1, -0.2, 0.3, 0.4]);
    embedCacheSet("abc123", "zembed-1", vec);
    const got = embedCacheGet("abc123", "zembed-1");
    expect(got).not.toBeNull();
    expect(got!.length).toBe(4);
    expect(got![0]).toBeCloseTo(0.1, 5);
    expect(got![1]).toBeCloseTo(-0.2, 5);
    expect(got![2]).toBeCloseTo(0.3, 5);
    expect(got![3]).toBeCloseTo(0.4, 5);
  });

  it("returns null for unknown hash", () => {
    expect(embedCacheGet("nope", "zembed-1")).toBeNull();
  });

  it("isolates by model name", () => {
    const vec = new Float32Array([1, 2, 3]);
    embedCacheSet("hash1", "zembed-1", vec);
    expect(embedCacheGet("hash1", "zembed-2")).toBeNull();
    expect(embedCacheGet("hash1", "zembed-1")).not.toBeNull();
  });
});
