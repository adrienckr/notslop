/**
 * Common Platform interface. Each source (reddit, hn, blogs, x) implements
 * `fetch()` and `normalize()`. The CLI commands fan out across enabled
 * platforms in parallel.
 */

import type { Config, FetchQuery, Post, SourceName } from "../types.js";

export interface Platform {
  /** Stable identifier. */
  name: SourceName;

  /** Whether this platform is enabled given the user's config. */
  isEnabled(config: Config): boolean;

  /** Fetch + normalize. Throws on hard errors; returns [] for soft errors. */
  fetch(query: FetchQuery, config: Config): Promise<Post[]>;
}

/**
 * Convert a DurationToken into a (start, end) pair of ISO timestamps. `end` is
 * always "now" — used for filtering platform responses.
 */
export function durationToRange(since: string | undefined): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  switch (since) {
    case "1h":
      start.setHours(start.getHours() - 1);
      break;
    case "6h":
      start.setHours(start.getHours() - 6);
      break;
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "all":
      start.setFullYear(2000);
      break;
    case "24h":
    case undefined:
    default:
      start.setHours(start.getHours() - 24);
      break;
  }
  return { start, end };
}

export function truncateText(text: string, limit = 2000): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
}
