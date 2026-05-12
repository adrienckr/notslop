# Changelog

All notable changes to this project will be documented here.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned by [SemVer](https://semver.org).

## [0.1.0] — 2026-05-11

### Added

- `social-context init` — interactive setup wizard (ZeroEntropy API key, X handles, blog list, default subreddits)
- `social-context digest <topic>` — multi-source digest, reranked
- `social-context trending <niche>` — what's hot in the last 6h
- `social-context pulse <topic>` — mention tracker with per-source histogram
- `social-context voices <topic>` — surface top influential authors by aggregate ZE score
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

- `~/.social-context/config.json` written by `init`
- Env overrides: `ZEROENTROPY_API_KEY`, `BRIGHTDATA_API_KEY`, `BRIGHTDATA_DATASET_ID`, `ZEROENTROPY_BASE_URL`

[0.1.0]: https://github.com/adrienckr/social-context/releases/tag/v0.1.0
