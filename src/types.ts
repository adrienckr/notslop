/**
 * Shared types across the notslop CLI.
 *
 * All platforms normalize into `Post`. Rerank produces `RankedPost`. The CLI
 * commands and output formatters consume those.
 */

export type SourceName = "reddit" | "hn" | "blogs" | "x";

export interface Post {
  /** Stable identifier within the source. */
  id: string;
  /** Where this post came from. */
  source: SourceName;
  /** Sub-source label — e.g. "r/ClaudeCode", "anthropic.com", "@karpathy". */
  sub_source?: string;
  /** Short title or first line. */
  title: string;
  /** Body text. Truncated to ~2000 chars before sending to ZE. */
  text: string;
  /** Author handle / username when available. */
  author?: string;
  /** ISO 8601 timestamp. */
  posted_at: string;
  /** Canonical URL. */
  url: string;
  /** Raw engagement signal (upvotes for Reddit, points for HN, likes for X). */
  score?: number;
  /** Number of comments / replies. */
  comments?: number;
  /** Free-form extras (kept narrow on purpose). */
  meta?: Record<string, string | number | boolean>;
}

export interface RankedPost {
  /** Original post payload. */
  post: Post;
  /** ZE rerank score in [0, 1]. */
  ze_score: number;
  /** Position in the reranked output (1-based). */
  rank: number;
}

export type DurationToken = "1h" | "6h" | "24h" | "7d" | "30d" | "all";

export interface FetchQuery {
  /** The free-form query string. */
  query: string;
  /** Optional duration window. */
  since?: DurationToken;
  /** Per-source overrides (only the relevant ones apply per platform). */
  subreddits?: string[];
  x_profiles?: string[];
  blog_urls?: string[];
  /** Max items to return at the platform level (before global rerank). */
  per_source_limit?: number;
}

export type OutputFormat = "json" | "md" | "table";

export interface Config {
  zeroentropy_api_key?: string;
  brightdata_api_key?: string;
  x_profiles: string[];
  blogs: string[];
  subreddits: string[];
  default_since: DurationToken;
  per_source_limit: number;
  cache_ttl_seconds: number;
}

export const DEFAULT_CONFIG: Config = {
  x_profiles: [],
  blogs: [],
  subreddits: [],
  default_since: "24h",
  per_source_limit: 50,
  cache_ttl_seconds: 600,
};
