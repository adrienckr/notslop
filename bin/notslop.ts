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
import { initCommand } from "../src/commands/init.js";
import { pulseCommand } from "../src/commands/pulse.js";
import { trendingCommand } from "../src/commands/trending.js";
import { voicesCommand } from "../src/commands/voices.js";
import { printBanner, printError } from "../src/output.js";
import { VERSION } from "../src/version.js";

const program = new Command();

program
  .name("notslop")
  .description("No more AI slop. Real-time social context for AI agents.")
  .version(VERSION, "-v, --version", "output the version number")
  .addHelpText("beforeAll", () => {
    if (!process.stdout.isTTY) return "";
    const out: string[] = [];
    // Capture the banner to a string by tee-ing kleur output. Simpler: re-render here.
    printBanner();
    return out.join("");
  });

program
  .command("init")
  .description("Interactive setup: ZeroEntropy key, X handles, blog list")
  .action(async () => {
    await initCommand();
  });

program
  .command("digest")
  .description("Multi-source digest of recent conversations on a topic")
  .argument("<topic>", "topic to digest")
  .option("--since <duration>", "1h | 6h | 24h | 7d | 30d | all", "24h")
  .option("--sources <list>", "reddit,hn,blogs,x  (default: all configured)")
  .option("--top <n>", "number of top results", "10")
  .option("--format <fmt>", "json | md | table", "md")
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
  .option("--top <n>", "rerank pool size (wider = better author signal)", "50")
  .option("--format <fmt>", "json | md | table", "md")
  .option("--debug", "show aggregation details")
  .option("--no-cache", "bypass cache, fresh fetch")
  .option("--config <path>", "override config file path")
  .action(async (topic: string, opts) => {
    await voicesCommand(topic, opts);
  });

// Last-resort top-level error handler. Each command already wraps its own
// body in try/catch, but if something escapes (e.g. an unhandled promise
// rejection during commander dispatch) we still want a clean exit code.
program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  printError(message);
  process.exit(1);
});
