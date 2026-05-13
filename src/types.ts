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

/** A named list saved in the user's config — collections of handles, blogs, or subreddits. */
export interface NamedList {
  /** Identifier used with `--list <name>`. */
  name: string;
  /** What this list contains. */
  kind: "x_profiles" | "blogs" | "subreddits";
  /** The handles, URLs, or subreddit slugs in this list. */
  items: string[];
}

export interface Config {
  zeroentropy_api_key?: string;
  brightdata_api_key?: string;
  /** Bright Data dataset id for the X — Posts by URL dataset, e.g. `gd_lwxk...`. */
  brightdata_dataset_id?: string;
  x_profiles: string[];
  blogs: string[];
  subreddits: string[];
  default_since: DurationToken;
  per_source_limit: number;
  cache_ttl_seconds: number;
  /** Optional collections of profiles / blogs / subreddits — used by `--list <name>`. */
  named_lists: NamedList[];
}

export const DEFAULT_CONFIG: Config = {
  x_profiles: [],
  blogs: [],
  subreddits: [],
  default_since: "24h",
  per_source_limit: 50,
  cache_ttl_seconds: 600,
  named_lists: [],
};

/** A single ZE embedding vector. We store as Float32Array for memory efficiency. */
export interface Embedding {
  /** Hash of the input text — primary key. */
  text_hash: string;
  /** Model that produced this vector, e.g. "zembed-1". */
  model: string;
  /** Vector dimensions, e.g. 1024. */
  dim: number;
  /** The vector itself. */
  vector: Float32Array;
}

/** A pair of posts found to be near-duplicates of each other. */
export interface DuplicatePair {
  /** Post we keep. */
  kept: Post;
  /** Post we drop (semantically equivalent). */
  dropped: Post;
  /** Cosine similarity between the two posts. */
  similarity: number;
}

/** A cluster of semantically related posts grouped by `cluster.ts`. */
export interface PostCluster {
  /** A human-readable label — usually the title of the highest-engagement post. */
  label: string;
  /** Members, sorted by intra-cluster centrality (most representative first). */
  members: Post[];
  /** Average pairwise cosine similarity inside the cluster — quality signal. */
  cohesion: number;
}

/** Result row from `find-related`. */
export interface RelatedPost {
  post: Post;
  /** Cosine similarity to the input. */
  similarity: number;
  /** 1-based position in the returned list. */
  rank: number;
}
