import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { installSkillsToDir, listAvailableSkills } from "../../src/commands/install.js";

describe("install skills", () => {
  let target: string;

  beforeEach(() => {
    target = mkdtempSync(join(tmpdir(), "notslop-install-"));
  });

  afterEach(() => {
    rmSync(target, { recursive: true, force: true });
  });

  it("listAvailableSkills returns all 12 skills bundled in the repo", () => {
    const skills = listAvailableSkills();
    expect(skills.length).toBeGreaterThanOrEqual(12);
    expect(skills).toContain("notslop-digest");
    expect(skills).toContain("notslop-find-related");
    expect(skills).toContain("notslop-write-x-tweet");
    expect(skills).toContain("notslop-write-x-article");
    expect(skills).toContain("notslop-write-reddit-reply");
  });

  it("installSkillsToDir copies all skill folders into target", () => {
    const count = installSkillsToDir(target);
    expect(count).toBeGreaterThanOrEqual(12);
    expect(existsSync(join(target, "notslop-digest", "SKILL.md"))).toBe(true);
    expect(existsSync(join(target, "notslop-write-x-tweet", "SKILL.md"))).toBe(true);
  });

  it("overwrites existing skill files", () => {
    installSkillsToDir(target);
    const skillPath = join(target, "notslop-digest", "SKILL.md");
    const before = readFileSync(skillPath, "utf8");
    writeFileSync(skillPath, "tampered");
    installSkillsToDir(target);
    const after = readFileSync(skillPath, "utf8");
    expect(after).toBe(before);
  });
});
