# Changelog

All notable changes to this project will be documented here.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned by [SemVer](https://semver.org).

## [0.6.0] — 2026-05-13

### Added — 7 new content-creation skills

- `notslop-write-blog-post` — long-form 1500-3000 words, SEO-aware. Inspired by
  Claude SEO patterns (E-E-A-T citations, per-section word counts, AI Overview
  citation-readiness, focus-keyword density targeting). Pulls 7-day signal,
  clusters themes via `pulse`, surfaces undercovered angles, then generates a
  content brief BEFORE the draft and the draft itself with inline citations
  to real posts.
- `notslop-write-blog-headline` — 8 candidate H1 titles + meta descriptions
  (155-160 chars) for a focus keyword. Hard caps + pattern mix (specific-outcome,
  contrarian, explainer, question, list). Lighter than the full blog-post skill.
- `notslop-write-show-hn-post` — Show HN launch post with title (<80 chars) +
  body grounded in recent Show HN posts in the same niche.
- `notslop-write-product-hunt-launch` — tagline + maker first comment + feature
  highlights for a PH launch.
- `notslop-write-readme-pitch` — README hero section for OSS repos (title,
  tagline, badges, what-it-is, quickstart, why-it's-different).
- `notslop-write-cold-dm` — personalized cold DM grounded in the recipient's
  recent posts. 50-90 words, no flattery, references a specific thing they said.
- `notslop-write-twitter-bio` — 5 bio variants for X (160-char cap) or LinkedIn
  headline. Patterns: observational / declarative / specific-results / playful /
  contrarian. Grounded in what's working in the user's niche.

Total skills shipped: 19 (12 existing + 7 new). All discovered automatically by
`notslop install --claude` — no code changes required.

### Changed

- `--help` text reorganized — skills now grouped under "Content creation" and
  "Research & analysis" with each new prompt listed.

## [0.5.0] — 2026-05-13

### Changed (breaking)

- `--api-key` flag is now optional (and effectively ignored). The companion
  `notslop-api` v0.2 dropped multi-tenancy entirely and runs as a stateless
  BYOK proxy — there are no user accounts to authenticate against.
- The `--api` codepath now does a single `POST /v1/scrape` with the local
  config (subreddits, X handles, blog URLs, Bright Data creds) embedded in the
  body, instead of the old `GET /v1/feed?topic=` against a per-user feed.

### Added

- BYOK pass-through: when a Bright Data API key is set in the local config
  and `BRIGHTDATA_DATASET_ID` (or `BRIGHTDATA_DATASET_ID_X_POSTS`) is in the
  environment, the CLI forwards both inside the API body so the hosted server
  scrapes X on the caller's account. The server never stores them.

### Notes

- Existing scripts that pass `--api-key` keep working — the flag is accepted
  silently for backwards compat with v0.4 wiring.
- ZeroEntropy rerank still runs locally on the user's own key, exactly as
  before. The hosted `notslop-api` never sees the ZE key.

## [0.4.0] — 2026-05-12

### Added

- **Vaporwave banner.** ASCII banner is now rendered with a per-character
  true-color gradient from cyan (`#00FFFF`) to magenta (`#FF00FF`). Pure
  TypeScript, zero new deps, ANSI 24-bit RGB. Falls back to plain cyan when
  the terminal doesn't advertise true-color via `COLORTERM`.
- Secondary tagline `signal in. slop out.` printed under the main tagline.
- **`--api <url> --api-key <key>` global flags.** When set, the CLI pulls raw
  posts from a hosted `notslop-api` gateway instead of fetching each platform
  directly. ZE rerank still runs on the user's own key (BYOK pattern).
  Equivalent env vars: `NOTSLOP_API_URL`, `NOTSLOP_API_KEY`.
- `src/api_client.ts` — small undici-based client for the hosted gateway.
- New `fetchAll` branch routes to the hosted API when creds are present,
  preserving all downstream pipeline (dedup, rerank, output, themes).

### Notes

- The hosted gateway lives in a separate repo, `adrienckr/notslop-api`. The
  CLI works fully without it — `--api` is opt-in.
- No breaking changes to existing commands or skills.

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
