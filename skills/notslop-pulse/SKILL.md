---
name: notslop-pulse
description: Track mentions of a topic across Reddit, Hacker News, blogs, and X over a multi-day window. Use when the user wants to know whether something is getting picked up, how mentions are trending, or to monitor a launch/release over time.
---

## Providers required

| Capability | Required | Providers (BYOK) | Setup | Cost |
|---|---|---|---|---|
| Pull social signal (Reddit/HN/blogs) | yes | built-in, no key needed | — | free |
| Rerank by relevance | yes | ZeroEntropy `zerank-2` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Embed for theme clustering | yes | ZeroEntropy `zembed-1` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Scrape X posts | **only if topic needs X data** | Orthogonal (ScrapeCreators) | [PROVIDERS.md#x-twitter--via-orthogonal](../../PROVIDERS.md#x-twitter--via-orthogonal) | ~$0.02/handle, $10 free at signup |

# When to use this skill

Activate when the user prompt sounds like any of:

- "Track mentions of <topic> over the last week."
- "Is <product / release> getting picked up?"
- "How is <topic> trending over time?"
- "Pulse check on <launch / paper / company>."
- "Sentiment on <topic> over the last <window>."

For a snapshot of the current conversation, use `notslop-digest`. For "who" is talking, use `notslop-voices`.

# Setup (one-time)

The user must have run `npx notslop init` and configured:

- A ZeroEntropy API key (free at https://dashboard.zeroentropy.dev).
- Optionally: X handles, blog URLs, Orthogonal key.

If config is missing, the CLI prints an actionable error. Surface it to the user verbatim and stop.

# Steps

1. Extract the topic from the user's prompt.
2. Pick a `--window` value. Default to `7d`. Use `30d` for "is this getting picked up at all" style asks, `24h` for a focused launch check.
3. Run via Bash:
   ```bash
   npx notslop@latest pulse "<TOPIC>" --window <WINDOW> --format md
   ```
4. Parse the markdown output. Note the per-source counts the CLI prints in the header — they're the trend signal.
5. Summarize for the user: total mentions, breakdown by source (`reddit`, `hn`, `blogs`, `x`), notable peaks, and the 3–5 most-relevant items with URLs.

# Example

> User: "Track mentions of zerank-2 over the last week."
> → Run: `npx notslop@latest pulse "zerank-2" --window 7d --format md`
> → Return: total count, source breakdown, top 3–5 cited items with URLs.
