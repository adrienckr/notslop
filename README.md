# social-context

**Give your AI agents eyes on what's happening today.** Pulls Reddit, Hacker News, blogs, and X — reranked by [ZeroEntropy](https://dashboard.zeroentropy.dev?utm_source=social-context-cli&utm_medium=readme&utm_campaign=v0.1).

[![npm version](https://img.shields.io/npm/v/social-context.svg)](https://www.npmjs.com/package/social-context)
[![node](https://img.shields.io/node/v/social-context.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/social-context.svg)](./LICENSE)

## The pitch

Training cutoffs make agents blind. They don't know what trended this morning, what people are saying about a release that shipped last week, or what your competitors blogged yesterday. Out-of-the-box LLMs answer from a frozen snapshot of the world.

`social-context` pulls from four sources you control — Reddit, Hacker News, a curated list of blogs, and a curated list of X handles — then reranks the combined pool with ZeroEntropy's `zerank-2` model. You get the top 10 actually-relevant items instead of 200 noisy ones. One command, JSON or markdown out, agent-ready.

## Quickstart (60 seconds)

```bash
npx social-context init
# wizard asks for ZE API key (free), X handles, blog list, default subs

npx social-context digest "AI agents" --since 24h
```

## Demo

`[asciinema embed coming soon — see DEMO.md]`

Sample output of `social-context digest "Claude 4.5" --since 24h --format md`:

```markdown
# Digest: Claude 4.5 (last 24h)

1. **Claude 4.5 Sonnet hits 81.4% on SWE-bench Verified** — hn (score: 0.94)
   312 points, 187 comments — https://news.ycombinator.com/item?id=42301188

2. **r/ClaudeAI: First impressions after a week on 4.5** — reddit (score: 0.91)
   u/agentbuilder — 1.2k upvotes, 340 comments — https://reddit.com/r/ClaudeAI/comments/1h8xx2k

3. **anthropic.com: Claude 4.5 release notes** — blogs (score: 0.89)
   anthropic.com — https://anthropic.com/news/claude-4-5

4. **@simonw: Initial Claude 4.5 evals — agentic coding is the headline** — x (score: 0.87)
   1.8k likes — https://x.com/simonw/status/1856201234567890

5. **r/LocalLLaMA: Claude 4.5 vs GPT-5 on long-horizon tasks** — reddit (score: 0.85)
   u/researcher_42 — 847 upvotes — https://reddit.com/r/LocalLLaMA/comments/1h8wq4p
```

## CLI reference

| Command    | Description                                                  |
|------------|--------------------------------------------------------------|
| `init`     | Interactive setup: ZeroEntropy key, X handles, blog list     |
| `digest`   | Multi-source digest of recent conversations on a topic       |
| `trending` | What's blowing up right now in a niche                       |
| `pulse`    | Mention tracker for a topic over a window                    |
| `voices`   | Surface influential voices on a topic                        |

Common options:

| Flag                 | Description                                           |
|----------------------|-------------------------------------------------------|
| `--since <duration>` | `1h`, `6h`, `24h`, `7d`, `30d`, `all` (per-command default) |
| `--sources <list>`   | Comma-separated: `reddit,hn,blogs,x` (default: all configured) |
| `--top <n>`          | Number of top results after rerank (default: 10)     |
| `--format <fmt>`     | `json`, `md`, or `table` (default: `md`)             |
| `--debug`            | Show ZE rerank scores per item                       |
| `--no-cache`         | Bypass cache, fresh fetch                            |
| `--config <path>`    | Override config file path                            |

Command-specific:

- `pulse --window <duration>` (default `7d`, alias `--since`)
- `voices --limit <n>` (default `5`)

## Sources

| Source       | Backend                          | Cost                             | Notes                              |
|--------------|----------------------------------|----------------------------------|------------------------------------|
| Reddit       | Public JSON API                  | Free                             | Always on                          |
| Hacker News  | Algolia API                      | Free                             | Always on                          |
| Blogs        | RSS or HTML scrape               | Free                             | You configure the URLs             |
| X (Twitter)  | Bright Data Datasets API         | ~$0.001–$0.01 per tweet          | Optional, bring your own key       |

## Setup

Environment variables:

- `ZEROENTROPY_API_KEY` — required. Free key from [dashboard.zeroentropy.dev](https://dashboard.zeroentropy.dev?utm_source=social-context-cli&utm_medium=readme&utm_campaign=v0.1).
- `BRIGHTDATA_API_KEY` — optional, enables the X source.
- `BRIGHTDATA_DATASET_ID` — optional, override the default X dataset id.
- `ZEROENTROPY_BASE_URL` — optional, point at a self-hosted ZE instance.

Config file location: `~/.social-context/config.json`. Written by `social-context init`. Holds your API keys, default `--since`, per-source fetch limits, cache TTL, and your curated lists of subreddits / X handles / blog URLs.

## Claude Code skills

Four `SKILL.md` files ship in this package under [`skills/`](./skills/):

- [`skills/digest/`](./skills/digest/SKILL.md) — "what's everyone saying about X"
- [`skills/trending/`](./skills/trending/SKILL.md) — "what's hot right now in X"
- [`skills/pulse/`](./skills/pulse/SKILL.md) — "track mentions of X over a window"
- [`skills/voices/`](./skills/voices/SKILL.md) — "who's talking about X"

To install, copy each directory into `~/.claude/skills/`:

```bash
cp -r ./skills/digest ~/.claude/skills/social-context-digest
cp -r ./skills/trending ~/.claude/skills/social-context-trending
cp -r ./skills/pulse ~/.claude/skills/social-context-pulse
cp -r ./skills/voices ~/.claude/skills/social-context-voices
```

Cursor and Cline users: point your tool's skill/rule loader at the same files.

## Why ZeroEntropy

Social feeds are noisy. A raw 200-post pull from Reddit + HN + your blog list mixes on-topic gold with adjacent chatter, low-signal jokes, and outright off-topic posts that happened to match a keyword. ZeroEntropy's `zerank-2` reranker scores every item against your query and lets you keep the top 10 that actually answer the question. Without rerank you either over-fetch and overwhelm the agent, or under-fetch and miss the post that mattered.

Get a free API key at [dashboard.zeroentropy.dev](https://dashboard.zeroentropy.dev?utm_source=social-context-cli&utm_medium=readme&utm_campaign=v0.1).

## Development

```bash
git clone https://github.com/adrienckr/social-context
cd social-context
npm install
npm run dev -- digest "test" --sources reddit
npm run build
npm test
```

## Roadmap (v0.2+)

- Bluesky as a fifth platform.
- Direct X scraping fallback so X works without a Bright Data key.
- Cross-source dedup (one canonical item per story across Reddit / HN / blogs / X).
- Webhook + cron mode for scheduled digests pushed into a channel.
- Hosted SaaS option with managed Bright Data and ZE quotas.

## License

MIT — see [LICENSE](./LICENSE).
