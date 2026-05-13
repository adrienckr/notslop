# Contributing

Thanks for considering a contribution. notslop is small, focused, and
welcoming to PRs that sharpen the core loop: fetch from a source, rerank with
ZeroEntropy, present cleanly.

## Quick start

```bash
git clone https://github.com/adrienckr/notslop.git
cd notslop
npm install
npm run dev -- digest "AI agents" --sources reddit,hn --since 24h
npm test
```

You'll need a free ZeroEntropy key from
[dashboard.zeroentropy.dev](https://dashboard.zeroentropy.dev/?utm_source=notslop-cli&utm_medium=docs&utm_campaign=v0.2)
to exercise the rerank path locally.

## Repo layout

```
bin/notslop.ts            CLI entry point (commander definitions)
src/commands/             One file per command (digest, trending, pulse, voices, init)
src/platforms/            One file per source (reddit, hn, blogs, x_orthogonal)
src/rerank/               ZeroEntropy zerank-2 client
src/cache.ts              SQLite-backed cache with TTL
src/config.ts             Config load/save, env overrides
src/output.ts             json | md | table formatters
src/types.ts              Shared types (Post, RankedPost, Config, ...)
skills/                   Claude Code skill bundles
tests/fixtures/           Recorded API responses for offline tests
```

## Adding a new platform

1. Implement the `Platform` interface from `src/platforms/_base.ts`
   (a `name` and an async `fetch(query: FetchQuery): Promise<Post[]>`).
2. Normalize results into the shared `Post` shape from `src/types.ts`.
3. Register the platform in `src/commands/_shared.ts` so commands can dispatch
   to it via `--sources`.
4. Add a fixture under `tests/fixtures/<platform>/` and a vitest spec that
   asserts the normalization.

Keep platform code free of CLI concerns — no console output, no process.exit.

## Adding a new command

1. Create `src/commands/<name>.ts` exporting an async `<name>Command` function.
2. Wire it up in `bin/notslop.ts` with the commander API, following the
   existing flag conventions (`--since`, `--sources`, `--top`, `--format`,
   `--debug`, `--no-cache`, `--config`).
3. Reuse `src/commands/_shared.ts` for fetch dispatch + rerank.

## Testing

We use [vitest](https://vitest.dev). Network calls are stubbed via fixtures in
`tests/fixtures/`. Run the suite with `npm test`. New platforms and commands
should ship with at least one happy-path test.

## Code style

- Biome handles formatting and linting: `npm run lint` / `npm run lint:fix`.
- Strict TypeScript. No `any` without a comment explaining why.
- ESM with explicit `.js` extensions on relative imports (TypeScript NodeNext).
- No emojis in source, output, or docs.
- Commit messages: short imperative subject ("add x platform", "fix rerank
  off-by-one"), body for the why when it's not obvious.

## Submitting PRs

- Link the issue you're closing.
- Branch naming: `feat/<short-slug>`, `fix/<short-slug>`, `docs/<short-slug>`.
- Keep PRs focused. One platform or one command per PR.
- Run `npm run typecheck && npm run lint && npm test` before pushing.

## Contributing to content skills

The 14 content-creation skills in `skills/notslop-write-*/` are the most
contribution-friendly part of the repo. Each one is a single `SKILL.md` file
that tells Claude how to write for a specific surface (a tweet, a thread, a
Reddit reply, a cold DM, a blog post, etc.). They ship as starting points —
the real quality ceiling on each surface comes from people who write that kind
of content every day.

PRs that **sharpen what's already there** are the most useful kind of
contribution notslop can get:

- **Better hook patterns** for a specific platform (e.g. what actually gets a
  tweet engagement in your niche).
- **Tighter output rules** to kill recurring slop phrasing.
- **Length / format constraints** that match how the platform's algo actually
  treats posts.
- **Real examples** of "good" vs "bad" output that the skill should produce.
- **New tone variants** for a skill that currently produces one voice.

PRs that **add a new content skill** are also welcome — pick a platform or
format not yet covered, follow the existing pattern, propose it.

### Skill file format

Each skill is a directory under `skills/` with a single `SKILL.md` file:

```
skills/notslop-write-x-tweet/
└── SKILL.md
```

Frontmatter + body:

```markdown
---
name: notslop-write-x-tweet
description: Use when the user wants to draft a single tweet on a topic. ...
---

## Providers required

| Capability | Required | Providers | Setup | Cost |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

# When to use this skill

- "Write me a tweet about X"
- ...

# Setup

# Steps

1. Run `notslop digest "<TOPIC>" --since 24h --top 10 --for-content`
2. Pick 2 specific data points from the digest.
3. Draft the tweet with the rules below.

# Output rules

- Hard cap 280 chars.
- No hashtags, no emojis unless asked.
- No "in today's rapidly evolving landscape" / generic openers.
- Cite the 2 data points concretely.
```

### How to propose a skill change

1. Edit the skill's `SKILL.md` directly.
2. In the PR description, include 1–2 real examples of "before" vs "after"
   output so a reviewer can see the improvement.
3. If the change is about banning a phrase or a structure, add the phrase to
   the skill's "Output rules" / "Constraints" block explicitly.
4. Don't change the file's `name:` frontmatter — it's the public skill slug
   and renaming it breaks every existing installation.

If you write a lot of tweets, threads, LinkedIn posts, Reddit posts, blog
posts, README hero blocks, cold DMs, Show HN launches, ProductHunt launches —
your taste is exactly what these skills are missing. The bar for getting a PR
merged is "this clearly produces less slop." Concrete before/after examples
make that easy to judge.

## Where ZeroEntropy fits

ZeroEntropy's zerank-2 reranker is the quality layer that turns "every result a
source returned" into "the few worth reading." Contributions that improve the
rerank flow, surface better signal from a source, or add new sources benefit
every user — those PRs are especially welcome.
