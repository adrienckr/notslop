/**
 * CLI output renderers for notslop.
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
import type { PostCluster, RankedPost, SourceName } from "./types.js";

// Respect TTY — disable colors when piping to a file or another process.
kleur.enabled = process.stdout.isTTY ?? false;

export interface PrintMeta {
  title: string;
  fetched: { source: string; count: number; status: "ok" | "skip" | "err"; detail?: string }[];
  total_posts: number;
  reranked: number;
  duration_ms?: number;
  /** Number of near-duplicate posts removed before rerank. v0.3+. */
  deduped?: number;
}

// ---------------------------------------------------------------------------
// Banner — shown on `--help` and at the start of the `init` wizard.
//
// v0.4 vaporwave: each character of the banner is rendered with a left-to-right
// gradient cyan → magenta using ANSI 24-bit true-color (\x1b[38;2;R;G;Bm).
// No new dep — pure TS. Works in every terminal that supports true-color
// (iTerm2, Warp, kitty, Alacritty, modern macOS Terminal, Linux gnome-terminal).
// Falls back to plain cyan when stdout isn't a TTY or COLORTERM is unset.
// ---------------------------------------------------------------------------

const BANNER_LINES: readonly string[] = [
  "███╗   ██╗ ██████╗ ████████╗███████╗██╗      ██████╗ ██████╗ ",
  "████╗  ██║██╔═══██╗╚══██╔══╝██╔════╝██║     ██╔═══██╗██╔══██╗",
  "██╔██╗ ██║██║   ██║   ██║   ███████╗██║     ██║   ██║██████╔╝",
  "██║╚██╗██║██║   ██║   ██║   ╚════██║██║     ██║   ██║██╔═══╝ ",
  "██║ ╚████║╚██████╔╝   ██║   ███████║███████╗╚██████╔╝██║     ",
  "╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚══════╝╚══════╝ ╚═════╝ ╚═╝     ",
];

const BANNER_TAGLINE = "fresh social context. no AI slop.";
const BANNER_SUBTAG = "signal in. slop out.";

const VAPORWAVE_FROM: [number, number, number] = [0, 255, 255]; // cyan
const VAPORWAVE_TO: [number, number, number] = [255, 0, 255]; // magenta

function supportsTrueColor(): boolean {
  if (!process.stdout.isTTY) return false;
  const colorterm = process.env.COLORTERM ?? "";
  if (colorterm === "truecolor" || colorterm === "24bit") return true;
  const term = process.env.TERM ?? "";
  return term.includes("256color") || term === "xterm-kitty" || term === "alacritty";
}

/**
 * Render `text` with a per-character RGB gradient from `from` to `to`.
 * Width is measured per-line; gradients restart on each newline so the
 * banner stays balanced regardless of line length.
 */
export function gradient(
  text: string,
  from: [number, number, number],
  to: [number, number, number],
): string {
  if (!supportsTrueColor()) return text;
  const lines = text.split("\n");
  const rendered = lines.map((line) => {
    const chars = Array.from(line);
    if (chars.length === 0) return "";
    return chars
      .map((ch, i) => {
        const t = chars.length > 1 ? i / (chars.length - 1) : 0;
        const r = Math.round(from[0] + (to[0] - from[0]) * t);
        const g = Math.round(from[1] + (to[1] - from[1]) * t);
        const b = Math.round(from[2] + (to[2] - from[2]) * t);
        return `\x1b[38;2;${r};${g};${b}m${ch}\x1b[0m`;
      })
      .join("");
  });
  return rendered.join("\n");
}

export function printBanner(): void {
  if (!process.stdout.isTTY) return;
  process.stdout.write("\n");
  for (const line of BANNER_LINES) {
    const colored = supportsTrueColor()
      ? gradient(line, VAPORWAVE_FROM, VAPORWAVE_TO)
      : kleur.cyan(line);
    process.stdout.write(`  ${colored}\n`);
  }
  process.stdout.write(`  ${kleur.dim(BANNER_TAGLINE)}\n`);
  process.stdout.write(`  ${kleur.dim().italic(BANNER_SUBTAG)}\n\n`);
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
  const dedupPart = meta.deduped && meta.deduped > 0 ? `, ${meta.deduped} dedup'd` : "";
  const summary = kleur.dim(
    `${meta.total_posts} posts${dedupPart} reranked across ${sourceCount} sources${durationPart}`,
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

/**
 * Render a cluster summary — one entry per theme, ordered by member count.
 * Used by `pulse`.
 */
export function printThemes(clusters: PostCluster[], title: string): void {
  if (clusters.length === 0) return;
  write(writeln());
  write(writeln(kleur.bold().white(title)));
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i]!;
    const rank = kleur.bold().white(`${String(i + 1).padStart(2, " ")}.`);
    const count = kleur.dim(`(${c.members.length} ${c.members.length === 1 ? "post" : "posts"})`);
    const cohesion = kleur.dim(`coh ${c.cohesion.toFixed(2)}`);
    write(writeln(`  ${rank} ${kleur.white(c.label)} ${count} ${cohesion}`));
    for (const m of c.members.slice(0, 2)) {
      const src = colorSource(m.source);
      const sub = m.sub_source ? ` ${kleur.dim("·")} ${kleur.dim(m.sub_source)}` : "";
      write(writeln(`        ${kleur.dim("→")} ${src}${sub} ${kleur.dim().underline(m.url)}`));
    }
  }
}

/**
 * Strip ANSI escape codes — for width calculations against colored strings.
 */
function stripAnsi(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape stripping needs them
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Wrap a block of text in a thin box. Used to visually separate themes /
 * related results from the main rerank list.
 */
export function boxedSection(title: string, content: string): string {
  const lines = content.split("\n");
  const maxLen = Math.max(title.length + 4, ...lines.map((l) => stripAnsi(l).length + 2));
  const width = Math.min(100, maxLen);
  const top = `┌─ ${kleur.bold().white(title)} ${"─".repeat(Math.max(0, width - title.length - 4))}┐`;
  const bottom = `└${"─".repeat(width)}┘`;
  const body = lines.map((l) => `│ ${l.padEnd(width - 2, " ")} │`).join("\n");
  return `${top}\n${body}\n${bottom}`;
}

/**
 * Condensed output for LLM consumption. Strips URLs to short forms, keeps
 * source + author + 1-line takeaway. Token-efficient so the calling agent
 * pays less.
 */
export function printContentMode(title: string, ranked: RankedPost[]): void {
  write(writeln(`# ${title}`));
  write(writeln());
  for (const r of ranked) {
    const src = `[${r.post.source}${r.post.sub_source ? ` · ${r.post.sub_source}` : ""}]`;
    const author = r.post.author ? ` @${r.post.author}` : "";
    write(writeln(`- ${src}${author} (sim ${r.ze_score.toFixed(2)})`));
    write(writeln(`  ${r.post.title}`));
    if (r.post.text.length > 0 && r.post.text !== r.post.title) {
      const oneLine = r.post.text.replace(/\s+/g, " ").slice(0, 240);
      write(writeln(`  > ${oneLine}`));
    }
  }
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
