---
name: notslop-trending
description: Surface what is blowing up right now in a niche across Reddit, Hacker News, blogs, and X. Short-window (6h default) scan reranked by ZeroEntropy. Use when the user wants the current pulse of a space, not a curated read on one topic.
---

# When to use this skill

Activate when the user prompt sounds like any of:

- "What's hot right now in <niche>?"
- "What's blowing up in <space>?"
- "What's trending in <topic / industry>?"
- "Show me what's getting attention in <community> this morning."

The signal here is *recency* — the user wants to know what people are reacting to *now*, not a deep read on one thing. For a curated read on one named topic, use `notslop-digest`.

# Setup (one-time)

The user must have run `npx notslop init` and configured:

- A ZeroEntropy API key (free at https://dashboard.zeroentropy.dev).
- Optionally: X handles, blog URLs, Bright Data key.

If config is missing, the CLI prints an actionable error. Surface it to the user verbatim and stop.

# Steps

1. Extract the niche from the user's prompt. Examples: `"AI agents"`, `"local LLMs"`, `"devtools"`.
2. Pick a `--since` window. The `trending` command defaults to `6h`; bump to `24h` only if the niche is slow-moving.
3. Run via Bash:
   ```bash
   npx notslop@latest trending "<NICHE>" --since <WINDOW> --format md
   ```
4. Parse the markdown output. Preserve source tags and URLs.
5. Return a ranked list — 5 to 10 items, one line each, source tag + URL preserved. Lead with the highest-ranked item.

# Example

> User: "What's hot right now in AI agents?"
> → Run: `npx notslop@latest trending "AI agents" --since 6h --format md`
> → Return the top 5–10 items as a short ranked list with source tags and URLs.
