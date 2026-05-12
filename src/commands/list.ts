/**
 * `notslop list` subcommands — manage named collections (x profiles, blog
 * URLs, subreddits). Used to scope content commands via `--list <name>`.
 */

import kleur from "kleur";

import { saveConfig } from "../config.js";
import { printError } from "../output.js";
import type { Config, NamedList } from "../types.js";
import { loadOrExit } from "./_shared.js";

type ListKind = NamedList["kind"];

function writeln(line = ""): void {
  process.stdout.write(`${line}\n`);
}

/** Pure helper: add items to a named list on a Config object. Mutates `config`. */
export function listAdd(config: Config, name: string, kind: ListKind, items: string[]): void {
  const existing = config.named_lists.find((l) => l.name === name);
  if (existing) {
    if (existing.kind !== kind) {
      throw new Error(
        `list "${name}": kind mismatch (existing ${existing.kind}, requested ${kind})`,
      );
    }
    const set = new Set(existing.items);
    for (const item of items) set.add(item);
    existing.items = [...set];
  } else {
    config.named_lists.push({ name, kind, items: [...new Set(items)] });
  }
}

export function listRemove(config: Config, name: string, items: string[]): void {
  const existing = config.named_lists.find((l) => l.name === name);
  if (!existing) throw new Error(`list "${name}" does not exist`);
  const drop = new Set(items);
  existing.items = existing.items.filter((i) => !drop.has(i));
}

export function listShow(config: Config, name: string): NamedList | null {
  return config.named_lists.find((l) => l.name === name) ?? null;
}

/** CLI dispatcher invoked by commander. */
export async function listCommand(
  action: "add" | "remove" | "show" | "ls",
  args: { name?: string; kind?: string; items?: string; configPath?: string },
): Promise<void> {
  try {
    const cfg = loadOrExit(args.configPath);

    if (action === "ls") {
      if (cfg.named_lists.length === 0) {
        writeln(
          kleur.dim(
            "No named lists configured. Add one with: notslop list add <name> --kind <kind> --items <csv>",
          ),
        );
        return;
      }
      for (const l of cfg.named_lists) {
        writeln(
          `${kleur.bold().white(l.name)} ${kleur.dim(`(${l.kind})`)} — ${kleur.dim(`${l.items.length} items`)}`,
        );
        writeln(`  ${l.items.join(", ")}`);
      }
      return;
    }

    if (!args.name) {
      printError("list name is required");
      process.exit(1);
    }

    if (action === "show") {
      const l = listShow(cfg, args.name);
      if (!l) {
        printError(`list "${args.name}" not found`);
        process.exit(1);
      }
      writeln(`${kleur.bold().white(l.name)} ${kleur.dim(`(${l.kind})`)}`);
      writeln(l.items.join("\n"));
      return;
    }

    const items = (args.items ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (items.length === 0) {
      printError("at least one item is required (comma-separated)");
      process.exit(1);
    }

    if (action === "add") {
      const kind = args.kind as ListKind | undefined;
      if (kind !== "x_profiles" && kind !== "blogs" && kind !== "subreddits") {
        printError("--kind must be one of: x_profiles, blogs, subreddits");
        process.exit(1);
      }
      listAdd(cfg, args.name, kind, items);
      saveConfig(cfg);
      writeln(kleur.green().bold(`Added ${items.length} item(s) to list "${args.name}".`));
      return;
    }

    if (action === "remove") {
      listRemove(cfg, args.name, items);
      saveConfig(cfg);
      writeln(kleur.green().bold(`Removed ${items.length} item(s) from list "${args.name}".`));
      return;
    }
  } catch (err) {
    printError((err as Error).message);
    process.exit(1);
  }
}
