<!-- markdownlint-disable MD033 MD013 -->

```
███╗   ██╗ ██████╗ ████████╗███████╗██╗      ██████╗ ██████╗ 
████╗  ██║██╔═══██╗╚══██╔══╝██╔════╝██║     ██╔═══██╗██╔══██╗
██╔██╗ ██║██║   ██║   ██║   ███████╗██║     ██║   ██║██████╔╝
██║╚██╗██║██║   ██║   ██║   ╚════██║██║     ██║   ██║██╔═══╝ 
██║ ╚████║╚██████╔╝   ██║   ███████║███████╗╚██████╔╝██║     
╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚══════╝╚══════╝ ╚═════╝ ╚═╝     
```

**Fresh social context for AI agents.** Reddit, Hacker News, blogs, X — reranked by ZeroEntropy, piped into Claude Code via 19 skills.

[![npm](https://img.shields.io/npm/v/notslop.svg)](https://www.npmjs.com/package/notslop)
[![node](https://img.shields.io/node/v/notslop.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/notslop.svg)](./LICENSE)

---

## What it does

You ask Claude Code to write a tweet, a blog post, a Reddit reply, a cold DM. Claude has no idea what's being said today on the topic, so the output reads like every other AI-generated post. `notslop` fixes the data layer: a shell command that pulls today's actual discussions and hands them to the agent before it writes.

```
$ notslop digest "Claude Code skills" --since 24h --top 5

  ████ NOTSLOP ████
  fresh social context. no AI slop.
  signal in. slop out.

  ✔ reddit    23 posts
  ✔ hn        12 posts
  ✔ blogs     4 posts
  ✔ x         8 posts
  ✔ Reranking via ZeroEntropy…

  ╭───────────────────────────────────────╮
  │ Digest: Claude Code skills            │
  ╰───────────────────────────────────────╯

  1. [reddit · r/ClaudeAI]  0.94
     New skills file format ships with v2.1
     @anthropic-team · 2h ago · https://reddit.com/...

  2. [hn]  0.91
     Show HN: I wrote 47 skills for Claude Code
     @swyx · 5h ago · https://news.ycombinator.com/...

  3. [x · @karpathy]  0.88
     skills > prompts. you give claude one instruction file...
     · 6h ago · https://x.com/...

  4. [blog · simonwillison.net]  0.85
     Notes on a week of building with skills
     · 11h ago · https://simonwillison.net/...

  5. [reddit · r/cursor]  0.82
     Cursor team comparing notes with claude skills approach
     · 14h ago · https://reddit.com/...

  47 posts, 9 dedup'd reranked across 4 sources in 1981ms
  Powered by ZeroEntropy  ·  https://dashboard.zeroentropy.dev
```

---

## Install

```bash
npx notslop init             # configure your ZE key + sources (one-time)
npx notslop install --claude # drop 19 skills into ~/.claude/skills/
```

The CLI works in any shell. The skills make it talk to Claude Code naturally.

---

## Two ways to use it

**1. Direct CLI** — works in any agent's shell (Claude Code, Cursor, Codex, Cline, Continue):

```bash
notslop digest "RAG production" --since 24h --top 10
notslop trending "agentic coding" --since 6h
notslop pulse "Anthropic" --window 7d
notslop voices "AI safety" --top 10
notslop find-related "https://your-draft-url"
```

**2. Inside Claude Code (natural language)** — after `install --claude`:

```
You: "write me a tweet about Claude Code skills"
Claude → runs `notslop digest "Claude Code skills" --for-content` in bash
Claude → reads the JSON, picks 2 specific data points
Claude → writes the tweet citing real posts from today
```

You get a tweet grounded in real signal instead of generic AI slop.

---

## Skills

19 total. All auto-installed by `install --claude`. Trigger them in Claude Code with natural language.

### Content creation (14)

| Skill | Trigger phrase |
|---|---|
| `notslop-write-x-tweet` | "write me a tweet about X" |
| `notslop-write-x-thread` | "write an X thread about X" |
| `notslop-write-x-article` | "write an X article on X" (long-form Notes) |
| `notslop-write-linkedin-post` | "write a LinkedIn post about X" |
| `notslop-write-reddit-post` | "write a Reddit post for r/X about Y" |
| `notslop-write-reddit-reply` | "reply to this Reddit thread: <url>" |
| `notslop-write-blog-post` | "write a blog post about X" (SEO-aware, 1500-3000 words) |
| `notslop-write-blog-headline` | "give me 8 title options for X" |
| `notslop-write-show-hn-post` | "write a Show HN for <my project>" |
| `notslop-write-product-hunt-launch` | "write a ProductHunt launch for <X>" |
| `notslop-write-readme-pitch` | "write a README hero for <my repo>" |
| `notslop-write-cold-dm` | "write a cold DM to @karpathy about Y" |
| `notslop-write-twitter-bio` | "rewrite my Twitter bio" |
| `notslop-repurpose` | "repurpose this post for LinkedIn and X" |

### Research & analysis (5)

| Skill | Trigger phrase |
|---|---|
| `notslop-digest` | "what's hot on X today" |
| `notslop-trending` | "what's blowing up in X right now" |
| `notslop-pulse` | "track mentions of X over 7 days" |
| `notslop-voices` | "who's shaping the X conversation" |
| `notslop-find-related` | "find posts similar to <url-or-text>" |

---

## How it works

```
your phrase to Claude Code
        │
        ▼
   matching skill loads (~/.claude/skills/notslop-*)
        │
        ▼
   skill runs `notslop digest "..." --for-content` in bash
        │
   ┌────┴────┬─────────┬─────────┐
   ▼         ▼         ▼         ▼
 reddit/    hn/      blogs/     x/
 JSON     Algolia   RSS+cheerio Bright Data
        │
        ▼
   ZeroEntropy zembed-1 (cross-source dedup)
        │
        ▼
   ZeroEntropy zerank-2 (rerank top 10 by relevance)
        │
        ▼
   condensed JSON returned to Claude
        │
        ▼
   Claude writes the post, citing 2 specific data points
```

Total: 1-3 seconds for cached topics, 5-10 seconds for fresh.

---

## Hosted gateway (optional)

A companion API exists at [github.com/adrienckr/notslop-api](https://github.com/adrienckr/notslop-api). If you don't want to wire Bright Data + run the scraping yourself, the CLI can pull raw posts from a hosted instance:

```bash
notslop digest "RAG" --api https://api.notslop.dev
```

The gateway is **stateless** — it never sees your ZeroEntropy key (rerank runs locally), and it doesn't store any record of who called it. Source code is MIT, self-host with `fly launch`.

---

## Configuration

`notslop init` writes `~/.notslop/config.json`. Env overrides for the values you'd rotate:

```
ZEROENTROPY_API_KEY      required for rerank/embed
BRIGHTDATA_API_KEY       optional, for X scraping
BRIGHTDATA_DATASET_ID    Bright Data dataset for X posts by URL
NOTSLOP_API_URL          point at a hosted notslop-api instance
```

---

## Disclosure

Built by [@adrienckr](https://github.com/adrienckr), Head of Growth at [ZeroEntropy](https://zeroentropy.dev). ZE is one possible rerank/embed provider; the CLI reads your ZE key locally and never sends it to any third party. The included `notslop-api` companion can be self-hosted if you don't trust the hosted instance.

## License

MIT. See [LICENSE](./LICENSE).
