---
name: notslop-voices
description: Surface the influential voices (authors, accounts, subreddits) on a topic across Reddit, Hacker News, blogs, and X. Use when the user wants to know who is shaping the conversation, not what is being said.
---

## Providers required

| Capability | Required | Providers (BYOK) | Setup | Cost |
|---|---|---|---|---|
| Pull social signal (Reddit/HN/blogs) | yes | built-in, no key needed | — | free |
| Rerank by relevance | yes | ZeroEntropy `zerank-2` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Scrape X posts | **only if topic needs X data** | Orthogonal (ScrapeCreators) | [PROVIDERS.md#x-twitter--via-orthogonal](../../PROVIDERS.md#x-twitter--via-orthogonal) | ~$0.02/handle, $10 free at signup |

# When to use this skill

Activate when the user prompt sounds like any of:

- "Who's talking about <topic>?"
- "Find influential voices on <subject>."
- "Key people in <niche>."
- "Who should I follow for <topic>?"
- "Which subreddits / accounts cover <topic>?"

If the user wants the *content* of the conversation rather than the people behind it, use `notslop-digest`.

# Setup (one-time)

The user must have run `npx notslop init` and configured:

- A ZeroEntropy API key (free at https://dashboard.zeroentropy.dev).
- Optionally: X handles, blog URLs, Orthogonal key. The X source materially improves voice discovery.

If config is missing, the CLI prints an actionable error. Surface it to the user verbatim and stop.

# Steps

1. Extract the topic from the user's prompt.
2. Pick a `--limit` (number of voices to surface). Default `5`. Bump to `10` for broader scans.
3. Optionally widen the rerank pool with `--top 100` so author signal aggregates over more items.
4. Run via Bash:
   ```bash
   npx notslop@latest voices "<TOPIC>" --limit <N> --since 7d --format md
   ```
5. Parse the markdown output. Each voice carries a handle/username, source, and example items.
6. Return a ranked list with the source tag, a one-line "why they matter" inferred from their cited items, and at least one example URL per voice.

# Example

> User: "Who's talking about rerankers on AI Twitter?"
> → Run: `npx notslop@latest voices "rerankers" --limit 5 --since 7d --sources x,hn --format md`
> → Return 5 voices, one line each, with source, handle, and a representative URL.
