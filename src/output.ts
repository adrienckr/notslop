/**
 * CLI output renderers for social-context.
 *
 * Three formats: human-readable markdown (default), a `cli-table3` table for
 * terminals, and machine-parseable JSON for agents. All three share the same
 * header / footer helpers so the look stays consistent.
 *
 * Writes go through `process.stdout.write` rather than `console.log` so JSON
 * output stays pipeable (no stray trailing newlines polluting parsers).
 */

import Table from "cli-table3";
import kleur from "kleur";

import { zeDashboardUrl } from "./telemetry.js";
import type { RankedPost, SourceName } from "./types.js";

// Respect TTY — disable colors when piping to a file or another process.
kleur.enabled = process.stdout.isTTY ?? false;

export interface PrintMeta {
  title: string;
  fetched: { source: string; count: number; status: "ok" | "skip" | "err"; detail?: string }[];
  total_posts: number;
  reranked: number;
  duration_ms?: number;
}

// ---------------------------------------------------------------------------
// Banner — shown on `--help` and at the start of the `init` wizard.
// ---------------------------------------------------------------------------

const BANNER_LINES: readonly string[] = [
  " ___  ___   ___ ___ ___ _    ___ ___  _  _ _____ _____  _______",
  "/ __|/ _ \\ / __|_ _/ _ \\ |  / __/ _ \\| \\| |_   _| __\\ \\/ /_   _|",
  "\\__ \\ (_) | (__ | | (_) | |_| (_| (_) | .` | | | | _| >  <  | |  ",
  "|___/\\___/ \\___|___\\___/____|\\___\\___/|_|\\_| |_| |___/_/\\_\\ |_|  ",
];

const BANNER_TAGLINE = "multi-source context for AI agents · powered by ZeroEntropy";

export function printBanner(): void {
  if (!process.stdout.isTTY) return;
  process.stdout.write("\n");
  for (const line of BANNER_LINES) {
    process.stdout.write(`  ${kleur.cyan(line)}\n`);
  }
  process.stdout.write(`  ${kleur.dim(BANNER_TAGLINE)}\n\n`);
}

// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

function write(line: string): void {
  process.stdout.write(line);
}

function writeln(line = ""): string {
  return `${line}\n`;
}

/** Color a source tag — distinct hue per platform. */
function colorSource(source: string): string {
  switch (source as SourceName) {
    case "reddit":
      return kleur.cyan(source);
    case "hn":
      return kleur.magenta(source);
    case "blogs":
      return kleur.blue(source);
    case "x":
      return kleur.bold().white(source);
    default:
      return source;
  }
}

/** Truncate with ellipsis, accounting for the ellipsis itself. */
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

/** Render an ISO date as a short relative phrase. */
export function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (diffSec < 45) return "just now";
  if (diffSec < 3600) {
    const m = Math.max(1, Math.round(diffSec / 60));
    return `${m}m ago`;
  }
  if (diffSec < 86400) {
    const h = Math.round(diffSec / 3600);
    return `${h}h ago`;
  }
  const days = Math.round(diffSec / 86400);
  if (days <= 30) return `${days}d ago`;
  // Older than a month — show the date.
  return new Date(iso).toISOString().slice(0, 10);
}

export function formatScore(score: number): string {
  return kleur.dim().gray(score.toFixed(2));
}

// ---------------------------------------------------------------------------
// Header / footer
// ---------------------------------------------------------------------------

export function formatHeader(title: string): string {
  const width = Math.max(title.length + 6, 50);
  const top = `╭${"─".repeat(width - 2)}╮`;
  const bottom = `╰${"─".repeat(width - 2)}╯`;
  // Two-space gutter on each side, pad title to interior width.
  const interior = ` ${title} `.padEnd(width - 2, " ");
  const mid = `│${interior}│`;
  return [top, mid, bottom].map((line) => kleur.bold().white(line)).join("\n");
}

export function formatFooter(meta: PrintMeta): string {
  const sourceCount = meta.fetched.filter((f) => f.status === "ok").length;
  const durationPart = typeof meta.duration_ms === "number" ? ` in ${meta.duration_ms}ms` : "";
  const summary = kleur.dim(
    `${meta.total_posts} posts reranked across ${sourceCount} sources${durationPart}`,
  );
  const cta = `${kleur.bold().cyan("Powered by ZeroEntropy")}  ${kleur.dim("·")}  ${kleur
    .dim()
    .underline(zeDashboardUrl("output-footer"))}`;
  return `${summary}\n${cta}`;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

export function printError(msg: string): void {
  write(writeln(`${kleur.red().bold("error")} ${kleur.red(msg)}`));
}

export function printDim(msg: string): void {
  write(writeln(kleur.dim(msg)));
}

/** One progress line, fixed-width label + status glyph + detail. */
export function progressLine(label: string, status: "ok" | "skip" | "err", detail: string): string {
  const labelCol = label.padEnd(14, " ");
  let glyph: string;
  let detailColored: string;
  switch (status) {
    case "ok":
      glyph = kleur.green("✓");
      detailColored = kleur.dim(detail);
      break;
    case "skip":
      glyph = kleur.yellow("-");
      detailColored = kleur.dim(detail);
      break;
    case "err":
      glyph = kleur.red("✗");
      detailColored = kleur.red(detail);
      break;
  }
  return `${glyph} ${kleur.bold(labelCol)} ${detailColored}`;
}

// ---------------------------------------------------------------------------
// Markdown format
// ---------------------------------------------------------------------------

export function printMarkdown(title: string, ranked: RankedPost[], meta: PrintMeta): void {
  write(writeln(formatHeader(title)));
  write(writeln());

  if (ranked.length === 0) {
    write(writeln(kleur.dim("No results.")));
    write(writeln());
    write(writeln(formatFooter(meta)));
    return;
  }

  for (const item of ranked) {
    const { post, ze_score, rank } = item;
    const rankCell = kleur.bold().white(`${rank.toString().padStart(2, " ")}.`);
    const sourceLabel = colorSource(post.source);
    const subLabel = post.sub_source
      ? `${sourceLabel} ${kleur.dim("·")} ${kleur.dim(post.sub_source)}`
      : sourceLabel;
    const head = `  ${rankCell} ${kleur.dim("[")}${subLabel}${kleur.dim("]")}  ${formatScore(ze_score)}`;
    write(writeln(head));

    const titleLine = `     ${kleur.white(post.title)}`;
    write(writeln(titleLine));

    const authorPart = post.author ? kleur.dim(`@${post.author}`) : kleur.dim("anonymous");
    const datePart = kleur.dim(relativeDate(post.posted_at));
    const urlPart = kleur.dim().underline(post.url);
    const sep = kleur.dim(" · ");
    write(writeln(`     ${authorPart}${sep}${datePart}${sep}${urlPart}`));

    write(writeln());
  }

  // TODO(v0.2): Trending themes — cluster ranked posts and surface top phrases.

  write(writeln(formatFooter(meta)));
}

// ---------------------------------------------------------------------------
// JSON format
// ---------------------------------------------------------------------------

export function printJson(ranked: RankedPost[]): void {
  const payload = {
    ranked: ranked.map((r) => ({
      rank: r.rank,
      ze_score: r.ze_score,
      post: r.post,
    })),
  };
  write(`${JSON.stringify(payload, null, 2)}\n`);
}

// ---------------------------------------------------------------------------
// Table format
// ---------------------------------------------------------------------------

export function printTable(ranked: RankedPost[], meta: PrintMeta): void {
  write(writeln(formatHeader(meta.title)));
  write(writeln());

  if (ranked.length === 0) {
    write(writeln(kleur.dim("No results.")));
    write(writeln());
    write(writeln(formatFooter(meta)));
    return;
  }

  const table = new Table({
    head: [
      kleur.bold("#"),
      kleur.bold("Score"),
      kleur.bold("Source"),
      kleur.bold("Title"),
      kleur.bold("URL"),
    ],
    colAligns: ["right", "right", "left", "left", "left"],
    style: {
      head: [],
      border: ["gray"],
    },
    wordWrap: false,
  });

  for (const item of ranked) {
    const { post, ze_score, rank } = item;
    const sourceCell = post.sub_source
      ? `${colorSource(post.source)} ${kleur.dim(post.sub_source)}`
      : colorSource(post.source);
    table.push([
      kleur.bold().white(String(rank)),
      formatScore(ze_score),
      sourceCell,
      truncate(post.title, 60),
      kleur.dim().underline(post.url),
    ]);
  }

  write(`${table.toString()}\n`);
  write(writeln());
  write(writeln(formatFooter(meta)));
}
