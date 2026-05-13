<p align="center">
  <img src=".github/assets/banner.svg" alt="NOTSLOP" width="620" />
</p>

<p align="center">
  Fresh social context for AI agents. Reddit, Hacker News, blogs and X,
  reranked and piped into Claude Code via 19 skills.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/notslop"><img src="https://img.shields.io/npm/v/notslop.svg?color=22d3ee&label=npm" alt="npm" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/notslop.svg?color=22d3ee&label=node" alt="node" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/notslop.svg?color=22d3ee&label=license" alt="license" /></a>
</p>

---

## What it does

Claude's training cutoff is months old. When you ask it to write a tweet or a Reddit reply on a topic, it has no information about what people are actually saying on that topic right now. The output usually invents examples and references trends that do not exist.

notslop fetches that missing context. It is a CLI plus a set of Claude Code skills. When you ask Claude Code to write something on a topic, the matching skill runs `notslop digest "<topic>"` in bash. That command pulls recent posts from Reddit, Hacker News, RSS blogs, and X, reranks them by relevance with ZeroEntropy, and returns the top 10 to Claude as context. Claude then writes the content using those posts.

The result is content that references real recent posts rather than fabricated ones.

---

## Setup

You need two free API keys.

1. ZeroEntropy, at dashboard.zeroentropy.dev. Used for the reranker and the embeddings. Free tier covers most usage.
2. Orthogonal, at orthogonal.com/sign-up. Used for X scraping. 10 USD of free credits at signup. Skip this if you do not need X.

Then:

```bash
npx notslop init
npx notslop install --claude
```

The first command asks for the two keys plus the X handles, subreddits, and blog URLs you want to track. The second drops 19 skill files into `~/.claude/skills/`.

---

## CLI

```bash
notslop digest        "<topic>"      # reranked digest of recent posts on a topic
notslop trending      "<niche>"      # what is moving in a niche over the last 6h
notslop pulse         "<topic>"      # mention tracker over 7d, clustered into themes
notslop voices        "<topic>"      # influential authors on a topic
notslop find-related  "<text|url>"   # semantic similarity to a draft or URL
notslop sources                      # status of every configured source
notslop list ls                      # manage named lists of profiles, blogs, subs
```

Run `notslop --help` for all flags.

---

## Skills

19 skills bundled. They trigger in Claude Code from natural language.

### Content creation (14)

| Platform | Skill | Purpose |
|---|---|---|
| X / Twitter | `notslop-write-x-tweet` | single tweet, 280-char cap |
|  | `notslop-write-x-thread` | multi-tweet sequence |
|  | `notslop-write-x-article` | long-form Notes, up to 25k chars |
|  | `notslop-write-twitter-bio` | bio rewrite, 5 patterns |
| LinkedIn | `notslop-write-linkedin-post` | 1000 to 1300 character post |
| Reddit | `notslop-write-reddit-post` | new post for a specific sub |
|  | `notslop-write-reddit-reply` | reply in an existing thread |
| Blog | `notslop-write-blog-post` | 1500 to 3000 word post with SEO-aware structure |
|  | `notslop-write-blog-headline` | 8 candidate H1 titles and meta descriptions |
| Launches | `notslop-write-show-hn-post` | Show HN title and body |
|  | `notslop-write-product-hunt-launch` | tagline, maker note, feature highlights |
|  | `notslop-write-readme-pitch` | hero section for an open-source repo |
| Outreach | `notslop-write-cold-dm` | personalised DM grounded in the recipient's recent posts |
| Reuse | `notslop-repurpose` | adapt an existing post to other platforms |

### Research and analysis (5)

| Skill | Purpose |
|---|---|
| `notslop-digest` | reranked digest of what is being said on a topic |
| `notslop-trending` | what is moving in a niche over the last 6h |
| `notslop-pulse` | mention tracker over 7d, clustered into themes |
| `notslop-voices` | influential authors on a topic |
| `notslop-find-related` | semantic similarity to a URL or text snippet |

Each skill is one SKILL.md file in `~/.claude/skills/notslop-*/`. The files are readable and intended to be edited or forked.

---

## Contributing to the content skills

The 14 content skills are bundled defaults. They work, but the per-platform output rules (length, tone, structure) are the part that benefits most from people who write that kind of content regularly.

If you write tweets, threads, LinkedIn posts, Reddit posts, blog posts, cold DMs, or launch posts on a regular basis, the most useful thing you can contribute is to open the relevant SKILL.md, sharpen the output rules section, and submit a PR with a before-and-after example.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the file structure and the PR review process.

---

## How it works

```
your phrase to Claude Code
        │
        ▼
   matching skill in ~/.claude/skills/notslop-*
        │
        ▼
   skill runs `notslop digest "<topic>" --for-content` in bash
        │
   ┌────┴────┬─────────┬─────────────┐
   ▼         ▼         ▼             ▼
 reddit    hn        blogs           x
 JSON    Algolia   RSS+cheerio    Orthogonal
 (free)  (free)    (free)         (~$0.02 per handle)
        │
        ▼
   ZeroEntropy zembed-1 for cross-source deduplication
        │
        ▼
   ZeroEntropy zerank-2 for top-10 relevance ranking
        │
        ▼
   condensed JSON returned to Claude
        │
        ▼
   Claude writes the content, citing 2 data points from real posts
```

Round-trip: roughly 1 to 3 seconds with a warm cache, 5 to 10 seconds on a cold fetch.

---

## Configuration

`notslop init` writes `~/.notslop/config.json`. Environment variables override what is in the file.

```
ZEROENTROPY_API_KEY      required, used locally for rerank and embed
ORTHOGONAL_API_KEY       optional, used for X scraping
```

---

## License

MIT. See [LICENSE](./LICENSE).
