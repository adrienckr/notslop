# Changelog

All notable changes to this project will be documented here.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned by [SemVer](https://semver.org).

## [0.3.2] — 2026-05-12

### Fixed

- ZeroEntropy embed request payload uses `input` (singular) instead of `inputs`.
  The live API returns HTTP 422 on `inputs`; verified with the production
  embed endpoint.
- ZeroEntropy embed response parser updated to read `results[].embedding`
  (OpenAI-style envelope) instead of the previous `embeddings: number[][]` shape.
  This unblocks `find-related`, cross-source dedup in `digest`, and theme
  clustering in `pulse` end-to-end against the live API.
- Embed-call error messages now include the API response body (truncated to
  300 chars) so payload-shape mismatches are debuggable from the CLI output
  alone, no curl needed.

## [0.3.1] — 2026-05-12

### Fixed

- Default ZeroEntropy base URL switched from `api.zeroentropy.com` (does not
  resolve) to `api.zeroentropy.dev`. Verified working against the live
  rerank endpoint.
- Embed endpoint is now overridable independently via `ZEROENTROPY_EMBED_URL`,
  and rerank via `ZEROENTROPY_RERANK_URL`. Useful when the embed path differs
  from the convention `${base}/models/embed`.

## [0.3.0] — 2026-05-12

### Added

- `notslop install --claude` — one-liner installer: drops every bundled
  skill into `~/.claude/skills/`, shows the ASCII banner plus a list of
  suggested slash commands. Runs after `init`. The CLI itself stays usable in
  any agent's shell without install.
- 12 Claude Code skills total: notslop-digest, -trending, -pulse, -voices,
  -find-related, -repurpose, -write-x-tweet, -write-x-thread, -write-x-article,
  -write-reddit-post, -write-reddit-reply, -write-linkedin-post.
- Cross-source dedup via ZeroEntropy zembed-1 in `digest`.
- Theme clustering in `pulse` (replaces per-source histogram as headline view).
- `find-related <input>` command — semantic similarity search across sources.
- Named lists: `notslop list add <name> --kind <kind> --items <csv>` plus
  `remove`, `show`, `ls`. Use with `--list <name>` on content commands.
- `--for-content` flag on `digest` — token-efficient output for LLM consumers.
- Per-platform live spinners in fetchAll (replaces global progress buffer).
- `boxedSection` helper for nested visual sections in custom output.

### Pinned

- ZeroEntropy embeddings (zembed-1) called via batched cache-miss strategy.
- Cosine similarity implemented in plain TS over Float32Array — no native deps.

## [0.2.0] — 2026-05-12

### Changed
- Renamed from `social-context` to `notslop`. The npm package is now
  `notslop`, the binary is `notslop`, and the repo lives at
  `adrienckr/notslop`. Old `social-context-*` skill names renamed to
  `notslop-*`.
- New tagline: "fresh social context. no AI slop."

### Added
- `notslop-write-post` skill — Claude Code skill that combines a
  fresh `digest` fetch with content generation. The skill tells the
  agent: pull the signal first, then write the post.
- `notslop-repurpose` skill — repurpose an existing post for other
  platforms using current social context.

### Notes
- The CLI surface is unchanged: `digest`, `trending`, `pulse`,
  `voices`, `init`. Only naming has moved.

## [0.1.0] — 2026-05-11

### Added

- `notslop init` — interactive setup wizard (ZeroEntropy API key, X handles, blog list, default subreddits)
- `notslop digest <topic>` — multi-source digest, reranked
- `notslop trending <niche>` — what's hot in the last 6h
- `notslop pulse <topic>` — mention tracker with per-source histogram
- `notslop voices <topic>` — surface top influential authors by aggregate ZE score
- Four platform integrations:
  - `reddit` — Reddit JSON API, free, always on
  - `hn` — Hacker News Algolia API, free, always on
  - `blogs` — RSS auto-discovery + cheerio HTML fallback, user-configured URLs
  - `x` — X (Twitter) via Bright Data Datasets API, user-configured handles
- ZeroEntropy zerank-2 reranking across all sources
- Local SQLite cache with configurable TTL
- Output formats: `json` (default), `md`, `table`
- Claude Code skills under `skills/` (digest, trending, pulse, voices)
- npm/npx distribution; Node 20+ required

### Configuration

- `~/.notslop/config.json` written by `init`
- Env overrides: `ZEROENTROPY_API_KEY`, `BRIGHTDATA_API_KEY`, `BRIGHTDATA_DATASET_ID`, `ZEROENTROPY_BASE_URL`

[0.2.0]: https://github.com/adrienckr/notslop/releases/tag/v0.2.0
[0.1.0]: https://github.com/adrienckr/notslop/releases/tag/v0.1.0
