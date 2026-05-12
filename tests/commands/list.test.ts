import { afterEach, describe, expect, it, vi } from "vitest";

import { listAdd, listRemove, listShow } from "../../src/commands/list.js";
import type { Config } from "../../src/types.js";
import { DEFAULT_CONFIG } from "../../src/types.js";

function makeConfig(): Config {
  return { ...DEFAULT_CONFIG, zeroentropy_api_key: "test" };
}

describe("named lists", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("listAdd creates a new list when name is new", () => {
    const cfg = makeConfig();
    listAdd(cfg, "ai-builders", "x_profiles", ["karpathy", "sama"]);
    expect(cfg.named_lists.length).toBe(1);
    expect(cfg.named_lists[0]!.name).toBe("ai-builders");
    expect(cfg.named_lists[0]!.items).toEqual(["karpathy", "sama"]);
  });

  it("listAdd merges items into existing list", () => {
    const cfg = makeConfig();
    listAdd(cfg, "ai-builders", "x_profiles", ["karpathy"]);
    listAdd(cfg, "ai-builders", "x_profiles", ["sama", "karpathy"]);
    expect(cfg.named_lists[0]!.items).toEqual(["karpathy", "sama"]);
  });

  it("listAdd throws if kind conflicts with existing list", () => {
    const cfg = makeConfig();
    listAdd(cfg, "ai-builders", "x_profiles", ["karpathy"]);
    expect(() => listAdd(cfg, "ai-builders", "subreddits", ["MachineLearning"])).toThrow(
      /kind mismatch/,
    );
  });

  it("listRemove drops items from a list", () => {
    const cfg = makeConfig();
    listAdd(cfg, "ai-builders", "x_profiles", ["karpathy", "sama"]);
    listRemove(cfg, "ai-builders", ["sama"]);
    expect(cfg.named_lists[0]!.items).toEqual(["karpathy"]);
  });

  it("listShow returns matching list or null", () => {
    const cfg = makeConfig();
    listAdd(cfg, "ai-builders", "x_profiles", ["karpathy"]);
    expect(listShow(cfg, "ai-builders")?.items).toEqual(["karpathy"]);
    expect(listShow(cfg, "nope")).toBeNull();
  });
});
