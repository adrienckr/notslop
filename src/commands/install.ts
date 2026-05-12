/**
 * `notslop install --claude` — one-liner installer.
 *
 * Assumes config exists (run `notslop init` first). Copies every bundled
 * SKILL.md folder from this package into `~/.claude/skills/` so Claude Code
 * picks them up via slash commands. Shows the ASCII banner + a summary +
 * a suggested-commands list, then exits.
 *
 * The CLI itself (`notslop digest "..."` etc.) works in every shell already —
 * this command exists purely to make the Claude Code UX nice.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import kleur from "kleur";

import { DEFAULT_CONFIG_PATH, configExists } from "../config.js";
import { printBanner, printError } from "../output.js";
import type { CommandOptions } from "./_shared.js";

interface InstallOptions extends CommandOptions {
  claude?: boolean;
}

const CLAUDE_SKILLS_DIR = join(homedir(), ".claude", "skills");

function writeln(line = ""): void {
  process.stdout.write(`${line}\n`);
}

/** Resolve the path to the skills/ folder shipped inside the installed npm package. */
function bundledSkillsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  let current = here;
  for (let i = 0; i < 5; i++) {
    const candidate = join(current, "skills");
    if (existsSync(candidate) && statSync(candidate).isDirectory()) return candidate;
    current = resolve(current, "..");
  }
  throw new Error("could not locate bundled skills/ directory");
}

export function listAvailableSkills(): string[] {
  const dir = bundledSkillsDir();
  return readdirSync(dir).filter((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() && existsSync(join(full, "SKILL.md"));
  });
}

/** Copy every bundled skill folder into `targetDir`. Returns number copied. */
export function installSkillsToDir(targetDir: string): number {
  const source = bundledSkillsDir();
  const skills = listAvailableSkills();
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
  for (const name of skills) {
    cpSync(join(source, name), join(targetDir, name), { recursive: true, force: true });
  }
  return skills.length;
}

export async function installCommand(opts: InstallOptions): Promise<void> {
  try {
    if (!opts.claude) {
      printError(
        "specify --claude (currently the only supported target). usage: notslop install --claude",
      );
      process.exit(1);
    }

    if (!configExists(opts.config)) {
      printError(
        "no config found. run `notslop init` first to set up your ZeroEntropy key, then `notslop install --claude`.",
      );
      process.exit(1);
    }

    printBanner();

    const installed = installSkillsToDir(CLAUDE_SKILLS_DIR);

    writeln(
      kleur.green().bold(`  ✓ ${installed} skills installed to ${kleur.dim(CLAUDE_SKILLS_DIR)}`),
    );
    writeln(kleur.green().bold(`  ✓ config at ${kleur.dim(opts.config ?? DEFAULT_CONFIG_PATH)}`));
    writeln();
    writeln(kleur.bold().white("  Setup complete. Open Claude Code and try one of these:"));
    writeln();
    const suggestions = [
      `${kleur.cyan("/notslop digest about")} ${kleur.dim("<topic>")}`,
      `${kleur.cyan("/notslop trending in")} ${kleur.dim("<niche>")}`,
      `${kleur.cyan("/notslop find related to")} ${kleur.dim("<url>")}`,
      `${kleur.cyan("/notslop write a tweet about")} ${kleur.dim("<topic>")}`,
      `${kleur.cyan("/notslop write an X article about")} ${kleur.dim("<topic>")}`,
      `${kleur.cyan("/notslop write a linkedin post about")} ${kleur.dim("<topic>")}`,
      `${kleur.cyan("/notslop write a reddit post for r/")} ${kleur.dim("<sub> about <topic>")}`,
      `${kleur.cyan("/notslop repurpose")} ${kleur.dim("<url>")}`,
    ];
    for (const s of suggestions) writeln(`    ${s}`);
    writeln();
    writeln(
      kleur.dim(`  The CLI works in any agent's shell too: `) +
        kleur.bold().white(`notslop digest "<topic>"`),
    );
  } catch (err) {
    printError((err as Error).message);
    process.exit(1);
  }
}
