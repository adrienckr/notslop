import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { embedCacheClear, embedCacheClose } from "../../src/embed/cache.js";
import { embedTexts } from "../../src/embed/zeroentropy.js";
import type { Config } from "../../src/types.js";
import { DEFAULT_CONFIG } from "../../src/types.js";

import fixture from "../fixtures/embedding_sample.json" with { type: "json" };

// Hoist the mock so vitest processes it before any imports are evaluated.
const mockRequest = vi.hoisted(() => vi.fn());

vi.mock("undici", async (importOriginal) => {
  const actual = await importOriginal<typeof import("undici")>();
  return { ...actual, request: mockRequest };
});

const config: Config = {
  ...DEFAULT_CONFIG,
  zeroentropy_api_key: "test_key",
  cache_ttl_seconds: 60,
};

function mockResponse(payload: unknown, status = 200) {
  return {
    statusCode: status,
    body: { json: async () => payload, text: async () => JSON.stringify(payload) },
  };
}

describe("embedTexts", () => {
  beforeEach(() => {
    embedCacheClear();
    mockRequest.mockReset();
  });
  afterEach(() => {
    embedCacheClose();
    vi.restoreAllMocks();
  });

  it("returns one vector per input text", async () => {
    mockRequest.mockResolvedValue(mockResponse(fixture));
    const out = await embedTexts(["a", "b", "c"], config);
    expect(out.length).toBe(3);
    expect(out[0]!.length).toBe(8);
    expect(out[0]![0]).toBeCloseTo(0.1, 5);
  });

  it("uses cache on second call", async () => {
    mockRequest.mockResolvedValue(mockResponse(fixture));
    await embedTexts(["a", "b", "c"], config);
    await embedTexts(["a", "b", "c"], config);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("only embeds the cache misses on partial overlap", async () => {
    mockRequest.mockResolvedValue(mockResponse(fixture));
    await embedTexts(["a", "b", "c"], config);
    mockRequest.mockClear();

    mockRequest.mockResolvedValueOnce(
      mockResponse({ results: [{ embedding: [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2] }] }),
    );
    const out = await embedTexts(["a", "b", "d"], config);
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(out.length).toBe(3);
    expect(out[2]![0]).toBeCloseTo(0.9, 5);
  });

  it("throws on missing API key", async () => {
    const noKey: Config = { ...config, zeroentropy_api_key: undefined };
    await expect(embedTexts(["a"], noKey)).rejects.toThrow(/ZEROENTROPY_API_KEY/);
  });

  it("throws clear message on 401", async () => {
    mockRequest.mockResolvedValue(mockResponse({ error: "unauthorized" }, 401));
    await expect(embedTexts(["a"], config)).rejects.toThrow(/auth failed/);
  });
});
