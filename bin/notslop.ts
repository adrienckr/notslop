/**
 * NOTSLOP CLI entry point.
 *
 * Five commands:
 *   init      — interactive setup wizard
 *   digest    — multi-source digest of recent conversations on a topic
 *   trending  — what's blowing up right now in a niche
 *   pulse     — mention tracker for a topic over a window
 *   voices    — surface influential voices on a topic
 */

import { Command } from "commander";

import { digestCommand } from "../src/commands/digest.js";
import { findRelatedCli } from "../src/commands/find_related.js";
import { initCommand } from "../src/commands/init.js";
import { installCommand } from "../src/commands/install.js";
import { listCommand } from "../src/commands/list.js";
import { pulseCommand } from "../src/commands/pulse.js";
import { sourcesCommand } from "../src/commands/sources.js";
import { trendingCommand } from "../src/commands/trending.js";
import { voicesCommand } from "../src/commands/voices.js";
import { printBanner, printError } from "../src/output.js";
import { VERSION } from "../src/version.js";

const program = new Command();

program
  .name("notslop")
  .description("No more AI slop. Real-time social context for AI agents.")
  .version(VERSION, "-v, --version", "output the version number")
  // v0.4 — hosted gateway flags (global). When set, the CLI pulls raw posts
  // from notslop-api instead of fetching each platform locally. ZE rerank
  // still runs on the user's own key (BYOK pattern).
  .option(
    "--api <url>",
    "Use hosted notslop-api gateway (e.g. https://notslop-api.fly.dev). Overrides local fetch.",
  )
  .option("--api-key <key>", "Bearer token for the hosted gateway")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.optsWithGlobals() as { api?: string; apiKey?: string };
    if (opts.api && !process.env.NOTSLOP_API_URL) {
      process.env.NOTSLOP_API_URL = opts.api;
    }
    if (opts.apiKey && !process.env.NOTSLOP_API_KEY) {
      process.env.NOTSLOP_API_KEY = opts.apiKey;
    }
  })
  .addHelpText("beforeAll", () => {
    if (!process.stdout.isTTY) return "";
    const out: string[] = [];
    // Capture the banner to a string by tee-ing kleur output. Simpler: re-render here.
    printBanner();
    return out.join("");
  })
  .addHelpText(
    "after",
    `
How it works:
  1. CLI fetches raw posts from Reddit + HN + blogs (RSS) + X (Orthogonal).
  2. ZeroEntropy  zembed-1  dedups near-duplicates across sources (cosine > 0.85).
  3. ZeroEntropy  zerank-2  reranks candidates by semantic relevance to your topic.
  4. Output is the top-N reranked posts — your agent grounds its writing in real signal.

  Get a free ZeroEntropy key:  https://dashboard.zeroentropy.dev

Claude Code skills (run \`notslop install --claude\` once, then use natural language):

  Content creation:
  "write me a tweet about <topic>"          → notslop-write-x-tweet
  "write an X thread about <topic>"         → notslop-write-x-thread
  "write an X article about <topic>"        → notslop-write-x-article
  "write a LinkedIn post about <topic>"     → notslop-write-linkedin-post
  "write a Reddit post for r/<sub>"         → notslop-write-reddit-post
  "reply to <reddit-thread-url>"            → notslop-write-reddit-reply
  "write a blog post about <topic>"         → notslop-write-blog-post (SEO-aware, 1500-3000 words)
  "write a blog title + meta on <topic>"    → notslop-write-blog-headline
  "write a Show HN post for <project>"      → notslop-write-show-hn-post
  "write a ProductHunt launch for <X>"      → notslop-write-product-hunt-launch
  "write a README hero for <repo>"          → notslop-write-readme-pitch
  "write a cold DM to <handle>"             → notslop-write-cold-dm
  "rewrite my Twitter bio"                  → notslop-write-twitter-bio
  "repurpose <my-post> for other platforms" → notslop-repurpose

  Research & analysis:
  "what's hot on <topic> today"             → notslop-digest / -trending
  "who's shaping the <topic> conversation"  → notslop-voices
  "track mentions of <topic> over 7 days"   → notslop-pulse
  "find posts similar to <url-or-text>"     → notslop-find-related

Each skill fetches fresh signal via the CLI and grounds the output in real posts.

Hosted gateway (optional):
  --api <url> --api-key <key>   pull raw posts from a hosted notslop-api
  ZE rerank still runs on YOUR ZeroEntropy key (BYOK pattern).
`,
  );

program
  .command("init")
  .description("Interactive setup: ZeroEntropy key, X handles, blog list")
  .action(async () => {
    await initCommand();
  });

program
  .command("install")
  .description("Install Claude Code skills + show splash (run after `init`)")
  .option("--claude", "Install skills into ~/.claude/skills/")
  .option("--config <path>", "Custom config file")
  .action(async (opts) => {
    await installCommand(opts);
  });

program
  .command("digest")
  .description("Multi-source digest of recent conversations on a topic")
  .argument("<topic>", "topic to digest")
  .option("--since <duration>", "1h | 6h | 24h | 7d | 30d | all", "24h")
  .option("--sources <list>", "reddit,hn,blogs,x  (default: all configured)")
  .option("--list <name>", "Scope to a named list (see `notslop list ls`)")
  .option("--top <n>", "number of top results", "10")
  .option("--format <fmt>", "json | md | table", "md")
  .option("--for-content", "Token-efficient output for LLM consumption (no URLs, condensed)")
  .option("--debug", "show ZE rerank scores per item")
  .option("--no-cache", "bypass cache, fresh fetch")
  .option("--config <path>", "override config file path")
  .action(async (topic: string, opts) => {
    await digestCommand(topic, opts);
  });

program
  .command("trending")
  .description("What's blowing up right now in a niche")
  .argument("<niche>", "niche to scan")
  .option("--since <duration>", "1h | 6h | 24h | 7d | 30d | all", "6h")
  .option("--sources <list>", "reddit,hn,blogs,x  (default: all configured)")
  .option("--list <name>", "Scope to a named list (see `notslop list ls`)")
  .option("--top <n>", "number of top results", "10")
  .option("--format <fmt>", "json | md | table", "md")
  .option("--debug", "show ZE rerank scores per item")
  .option("--no-cache", "bypass cache, fresh fetch")
  .option("--config <path>", "override config file path")
  .action(async (niche: string, opts) => {
    await trendingCommand(niche, opts);
  });

program
  .command("pulse")
  .description("Mention tracker for a topic over a window")
  .argument("<topic>", "topic to track")
  .option("--window <duration>", "1h | 6h | 24h | 7d | 30d | all", "7d")
  .option("--since <duration>", "alias for --window", undefined)
  .option("--sources <list>", "reddit,hn,blogs,x  (default: all configured)")
  .option("--list <name>", "Scope to a named list (see `notslop list ls`)")
  .option("--top <n>", "number of top results", "10")
  .option("--format <fmt>", "json | md | table", "md")
  .option("--debug", "show ZE rerank scores per item")
  .option("--no-cache", "bypass cache, fresh fetch")
  .option("--config <path>", "override config file path")
  .action(async (topic: string, opts) => {
    await pulseCommand(topic, opts);
  });

program
  .command("voices")
  .description("Surface influential voices on a topic")
  .argument("<topic>", "topic to scan")
  .option("--limit <n>", "number of voices to surface", "5")
  .option("--since <duration>", "1h | 6h | 24h | 7d | 30d | all", "7d")
  .option("--sources <list>", "reddit,hn,blogs,x  (default: all configured)")
  .option("--list <name>", "Scope to a named list (see `notslop list ls`)")
  .option("--top <n>", "rerank pool size (wider = better author signal)", "50")
  .option("--format <fmt>", "json | md | table", "md")
  .option("--debug", "show aggregation details")
  .option("--no-cache", "bypass cache, fresh fetch")
  .option("--config <path>", "override config file path")
  .action(async (topic: string, opts) => {
    await voicesCommand(topic, opts);
  });

program
  .command("sources")
  .description("Show status of every scraping source + rerank provider (missing keys, setup links)")
  .option("--check <name>", "Live-test one source: reddit | hn | blogs | x | zeroentropy")
  .option("--config <path>", "override config file path")
  .action(async (opts) => {
    await sourcesCommand(opts);
  });

program
  .command("find-related <input>")
  .description("Find recent posts semantically similar to a URL or text input")
  .option("--since <duration>", "Lookback window (1h | 6h | 24h | 7d | 30d | all)", "7d")
  .option("--sources <list>", "Comma-separated: reddit,hn,blogs,x")
  .option("--list <name>", "Scope to a named list (see `notslop list ls`)")
  .option("--top <n>", "Number of top results", "10")
  .option("--format <fmt>", "json | md | table", "md")
  .option("--debug", "Verbose debug output")
  .option("--no-cache", "Bypass cache")
  .option("--config <path>", "Custom config file")
  .action(async (input, opts) => {
    await findRelatedCli(input, opts);
  });

const listCmd = program
  .command("list")
  .description("Manage named collections (x profiles, blogs, subreddits)");

listCmd
  .command("add <name>")
  .description("Add items to a named list")
  .requiredOption("--kind <kind>", "x_profiles | blogs | subreddits")
  .requiredOption("--items <csv>", "Comma-separated items")
  .option("--config <path>")
  .action(async (name, opts) => {
    await listCommand("add", { name, kind: opts.kind, items: opts.items, configPath: opts.config });
  });

listCmd
  .command("remove <name>")
  .description("Remove items from a named list")
  .requiredOption("--items <csv>", "Comma-separated items")
  .option("--config <path>")
  .action(async (name, opts) => {
    await listCommand("remove", { name, items: opts.items, configPath: opts.config });
  });

listCmd
  .command("show <name>")
  .description("Show a named list")
  .option("--config <path>")
  .action(async (name, opts) => {
    await listCommand("show", { name, configPath: opts.config });
  });

listCmd
  .command("ls")
  .description("List all named lists")
  .option("--config <path>")
  .action(async (opts) => {
    await listCommand("ls", { configPath: opts.config });
  });

// Last-resort top-level error handler. Each command already wraps its own
// body in try/catch, but if something escapes (e.g. an unhandled promise
// rejection during commander dispatch) we still want a clean exit code.
program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  printError(message);
  process.exit(1);
});
