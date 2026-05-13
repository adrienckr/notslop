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

## The problem

You ask Claude Code to write a tweet on RAG, a LinkedIn post on agent design, a Reddit reply in r/ClaudeAI. Claude has no idea what's being said today on the topic — the training cutoff is months old. So the output reads like AI slop: generic, vague, citing "trends" that don't exist.

`notslop` is the data layer that fixes it. A shell command that pulls today's actual discussions across Reddit, HN, blogs, and X. Reranks them by relevance with ZeroEntropy. Hands the top 10 to the agent before it writes.

Result: the post cites real things, real people, real numbers. Stops reading like a slop generator.

---

## 60-second setup

You need two free accounts and one command.

**1. Sign up at [zeroentropy.dev](https://dashboard.zeroentropy.dev)** — grab your API key (`ze_...`). Free tier covers most usage.

**2. Sign up at [orthogonal.com](https://orthogonal.com/sign-up)** — grab your API key (`orth_live_...`). $10 free credits at signup, enough for ~500 X scrapes. Skip this if you don't care about X.

**3. Install and configure:**

```bash
npx notslop init             # paste your two keys + pick your X handles / subreddits / blogs
npx notslop install --claude # drop 19 skills into ~/.claude/skills/
```

Open Claude Code. Type *"write me a tweet about [your topic]"*. Done.

---

## What it looks like running

```
$ notslop digest "Claude Code skills" --since 24h --top 5

  ✔ reddit    23 posts
  ✔ hn        12 posts
  ✔ blogs      4 posts
  ✔ x          8 posts
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
     skills > prompts. you give claude one instruction file…
     · 6h ago · https://x.com/...

  47 posts, 9 dedup'd reranked across 4 sources in 1981ms
  Powered by ZeroEntropy
```

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

**2. Inside Claude Code (natural language)** — after `notslop install --claude`:

```
You: "write me a tweet about Claude Code skills"

Claude → bash: notslop digest "Claude Code skills" --for-content
Claude → reads the JSON, picks 2 specific data points
Claude → writes the tweet citing real posts from today
```

You get a tweet grounded in real signal. Not slop.

---

## Skills

19 total. All auto-installed by `notslop install --claude`. Trigger them in Claude Code with natural language.

### Content creation (14)

| Skill | Trigger phrase |
|---|---|
| `notslop-write-x-tweet` | *"write me a tweet about &lt;topic&gt;"* |
| `notslop-write-x-thread` | *"write an X thread about &lt;topic&gt;"* |
| `notslop-write-x-article` | *"write an X article on &lt;topic&gt;"* (long-form Notes) |
| `notslop-write-linkedin-post` | *"write a LinkedIn post about &lt;topic&gt;"* |
| `notslop-write-reddit-post` | *"write a Reddit post for r/&lt;sub&gt; about &lt;topic&gt;"* |
| `notslop-write-reddit-reply` | *"reply to this Reddit thread: &lt;url&gt;"* |
| `notslop-write-blog-post` | *"write a blog post about &lt;topic&gt;"* (SEO-aware, 1500-3000 words) |
| `notslop-write-blog-headline` | *"give me 8 title options for &lt;topic&gt;"* |
| `notslop-write-show-hn-post` | *"write a Show HN for &lt;my project&gt;"* |
| `notslop-write-product-hunt-launch` | *"write a ProductHunt launch for &lt;X&gt;"* |
| `notslop-write-readme-pitch` | *"write a README hero for &lt;my repo&gt;"* |
| `notslop-write-cold-dm` | *"write a cold DM to @karpathy about &lt;topic&gt;"* |
| `notslop-write-twitter-bio` | *"rewrite my Twitter bio"* |
| `notslop-repurpose` | *"repurpose this post for LinkedIn and X"* |

### Research & analysis (5)

| Skill | Trigger phrase |
|---|---|
| `notslop-digest` | *"what's hot on &lt;topic&gt; today"* |
| `notslop-trending` | *"what's blowing up in &lt;niche&gt; right now"* |
| `notslop-pulse` | *"track mentions of &lt;topic&gt; over 7 days"* |
| `notslop-voices` | *"who's shaping the &lt;topic&gt; conversation"* |
| `notslop-find-related` | *"find posts similar to &lt;url-or-text&gt;"* |

Each skill is a small `SKILL.md` in `~/.claude/skills/notslop-*/` after `install --claude`. Read them, tweak them, fork them — they're MIT.

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
   ┌────┴────┬─────────┬─────────────┐
   ▼         ▼         ▼             ▼
 reddit/    hn/      blogs/         x/
 JSON     Algolia   RSS+cheerio   Orthogonal
 (free)   (free)    (free)        ($0.02/handle)
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

Total round-trip: 1–3 seconds for cached topics, 5–10 seconds for fresh.

---

## Sources & providers

Two keys total. ZeroEntropy is the only one that's required; Orthogonal is optional and only needed if you want X scraping.

| If you want to use… | You need | Cost |
|---|---|---|
| Reddit, HN, blogs (default) | nothing | free |
| Rerank + embed (required) | a ZeroEntropy account | free tier covers most usage |
| X (Twitter) | an Orthogonal account | $10 free credits → ~$0.02 per handle scrape |

Full per-source setup walkthroughs are in [PROVIDERS.md](./PROVIDERS.md). Run `notslop sources` to see what's wired and what's missing on your machine. `notslop sources --check x` live-tests a source.

---

## Hosted gateway (optional)

If you don't want to wire Orthogonal locally, the CLI can pull raw posts from a hosted instance:

```bash
notslop digest "RAG" --api https://api.notslop.dev
```

The gateway is **stateless** — it never sees your ZeroEntropy key (rerank runs locally on your machine), and it doesn't store any record of who called it. Source: [github.com/adrienckr/notslop-api](https://github.com/adrienckr/notslop-api). MIT-licensed, self-host with one `fly launch`.

---

## Configuration

`notslop init` writes `~/.notslop/config.json`. Env vars override what's in the file:

```
ZEROENTROPY_API_KEY      required — rerank + embed (runs locally)
ORTHOGONAL_API_KEY       optional — X scraping (via ScrapeCreators)
NOTSLOP_API_URL          optional — point at a hosted notslop-api instance
```

---

## Companion repos

- [`notslop-api`](https://github.com/adrienckr/notslop-api) — the stateless BYOK gateway behind `--api`. MIT. Self-hostable in 5 minutes on Fly.io.
- [`notslop-web`](https://github.com/adrienckr/notslop-web) — the landing page at [notslop.dev](https://notslop.dev). Astro + Tailwind. MIT.

---

## Notes

Built by [@adrienckr](https://github.com/adrienckr). MIT-licensed. ZeroEntropy is one of several rerank/embed providers you could swap in; nothing about the CLI requires you to use it specifically — it's just what the bundled skills call by default. Your ZE key stays on your machine, never touches the hosted gateway.

## License

MIT. See [LICENSE](./LICENSE).
