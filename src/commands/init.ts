/**
 * Interactive `notslop init` wizard.
 *
 * Walks a first-time user through:
 *   1. Acquiring a ZeroEntropy API key (links to dashboard)
 *   2. Optionally configuring Orthogonal for X / Twitter
 *   3. Listing competitor blogs and default subreddits
 *
 * Writes the resulting Config to ~/.notslop/config.json via `saveConfig`.
 */

import { input, password } from "@inquirer/prompts";
import kleur from "kleur";

import { DEFAULT_CONFIG_PATH, saveConfig } from "../config.js";
import { printBanner, printDim, printError } from "../output.js";
import { ORTHOGONAL_SIGNUP_URL, zeDashboardUrl } from "../telemetry.js";
import { type Config, DEFAULT_CONFIG } from "../types.js";

function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function writeln(line = ""): void {
  process.stdout.write(`${line}\n`);
}

function banner(): void {
  printBanner();
  writeln(kleur.bold().white("  init wizard"));
  writeln(kleur.dim("  Set up your ZeroEntropy key, X handles, blogs, and default subs."));
  writeln();
}

export async function initCommand(): Promise<void> {
  try {
    banner();

    const dashboardUrl = zeDashboardUrl("init-wizard");
    writeln(
      kleur.bold("ZeroEntropy API key (required for rerank + embed — the heart of notslop)."),
    );
    writeln(kleur.dim(`  → Get one free at ${dashboardUrl}`));
    writeln(kleur.dim("  → Free tier covers ~3000 calls/month."));
    writeln(
      kleur.dim("  → Skip with empty input only if you plan to set ZEROENTROPY_API_KEY via env."),
    );
    writeln();

    const zeKey = await password({
      message: "Enter your ZeroEntropy API key:",
      mask: "*",
      validate: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) return "API key cannot be empty";
        return true;
      },
    });

    writeln();
    writeln(kleur.bold("Orthogonal API key (optional — only for X / Twitter scraping)."));
    writeln(kleur.dim(`  → Get one at ${ORTHOGONAL_SIGNUP_URL}`));
    writeln(kleur.dim("  → $10 free credits at signup = ~500 X handle scrapes free"));
    writeln(kleur.dim("  → Costs ~$0.02 per handle scrape after the free tier"));
    writeln(kleur.dim("  → Skip if you only want Reddit/HN/blogs (covers ~95% of AI/dev signal)"));
    writeln();

    const orthRaw = await password({
      message: "Enter your Orthogonal API key (press Enter to skip):",
      mask: "*",
      validate: () => true,
    });

    let orthogonalKey: string | undefined;
    let xProfiles: string[] = [];
    const orthKeyTrimmed = orthRaw.trim();
    if (orthKeyTrimmed.length > 0) {
      orthogonalKey = orthKeyTrimmed;

      writeln();
      const handles = await input({
        message: "X handles to track (comma-separated, with or without @):",
        default: "",
      });
      xProfiles = splitCsv(handles).map((h) => (h.startsWith("@") ? h.slice(1) : h));
    }

    const blogsRaw = await input({
      message: "Competitor blogs to track (comma-separated URLs, or leave empty):",
      default: "",
    });
    const blogs = splitCsv(blogsRaw);

    const subsRaw = await input({
      message: "Default subreddits to scope Reddit searches (comma-separated, or leave empty):",
      default: "",
    });
    const subreddits = splitCsv(subsRaw).map((s) =>
      s
        .replace(/^\/?r\//i, "")
        .replace(/^\//, "")
        .trim(),
    );

    const config: Config = {
      ...DEFAULT_CONFIG,
      zeroentropy_api_key: zeKey.trim(),
      orthogonal_api_key: orthogonalKey,
      x_profiles: xProfiles,
      blogs,
      subreddits,
    };

    saveConfig(config);

    writeln();
    writeln(kleur.green().bold("Setup complete."));
    printDim(`  config written to ${DEFAULT_CONFIG_PATH}`);
    writeln();
    writeln(kleur.bold("Try it:"));
    writeln(`  ${kleur.cyan('notslop digest "AI agents" --since 24h')}`);
    writeln();
  } catch (err) {
    // @inquirer/prompts throws on Ctrl-C — render it as a clean cancel rather than a stack.
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("force closed") || message.includes("User force closed")) {
      printDim("\ncancelled.");
      process.exit(130);
    }
    printError(message);
    process.exit(1);
  }
}
