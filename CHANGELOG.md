# Changelog

All notable changes to this project will be documented here.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned by [SemVer](https://semver.org).

## [0.3.0] — unreleased

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
