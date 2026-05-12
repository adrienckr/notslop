/**
 * Interactive `social-context init` wizard.
 *
 * Walks a first-time user through:
 *   1. Acquiring a ZeroEntropy API key (links to dashboard)
 *   2. Optionally configuring Bright Data for X / Twitter
 *   3. Listing competitor blogs and default subreddits
 *
 * Writes the resulting Config to ~/.social-context/config.json via `saveConfig`.
 */

import { confirm, input, password } from "@inquirer/prompts";
import kleur from "kleur";

import { DEFAULT_CONFIG_PATH, saveConfig } from "../config.js";
import { printBanner, printDim, printError } from "../output.js";
import { BRIGHTDATA_SIGNUP_URL, zeDashboardUrl } from "../telemetry.js";
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
    const openDashboard = await confirm({
      message: "Open dashboard.zeroentropy.dev to grab a free API key now?",
      default: true,
    });
    if (openDashboard) {
      writeln();
      writeln(kleur.bold("Visit:"));
      writeln(`  ${kleur.underline().cyan(dashboardUrl)}`);
      writeln(kleur.dim("Create a key, then come back here to paste it."));
      writeln();
    }

    const zeKey = await password({
      message: "Paste your ZeroEntropy API key:",
      mask: "*",
      validate: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) return "API key cannot be empty";
        return true;
      },
    });

    const wantBrightData = await confirm({
      message: "Configure Bright Data now for X (Twitter) access? You can skip and add later.",
      default: false,
    });

    let brightDataKey: string | undefined;
    let xProfiles: string[] = [];
    if (wantBrightData) {
      writeln();
      writeln(kleur.bold("Bright Data signup:"));
      writeln(`  ${kleur.underline().cyan(BRIGHTDATA_SIGNUP_URL)}`);
      writeln();

      const bdRaw = await password({
        message: "Paste your Bright Data API key:",
        mask: "*",
        validate: (value) => (value.trim().length === 0 ? "key cannot be empty" : true),
      });
      brightDataKey = bdRaw.trim();

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
      brightdata_api_key: brightDataKey,
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
    writeln(`  ${kleur.cyan('social-context digest "AI agents" --since 24h')}`);
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
