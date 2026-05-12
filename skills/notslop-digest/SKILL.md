---
name: notslop-digest
description: Pull a multi-source social digest (Reddit, Hacker News, blogs, X) on a topic and summarize what people are actually saying right now. Use when the user wants the current conversation around a specific subject.
---

# When to use this skill

Activate when the user prompt sounds like any of:

- "What's everyone saying about <topic>?"
- "Give me a digest on <topic>."
- "What's the buzz around <release / company / paper / product>?"
- "Catch me up on the <topic> conversation from the last <window>."

If the user wants raw trending volume rather than a curated read, prefer `notslop-trending`. If they want a time-series view, use `notslop-pulse`.

# Setup (one-time)

The user must have run `npx notslop init` and configured:

- A ZeroEntropy API key (free at https://dashboard.zeroentropy.dev).
- Optionally: a list of X handles, a list of blog URLs, and a Bright Data API key (only needed for the X source).

If config is missing, the CLI prints an actionable error. Surface it to the user verbatim and stop.

# Steps

1. Extract the topic from the user's prompt. Keep it short and quoted.
2. Pick a `--since` window. Default to `24h`. Use `6h` for very fresh asks, `7d` for "this week", `30d` for "this month".
3. Run via Bash:
   ```bash
   npx notslop@latest digest "<TOPIC>" --since <WINDOW> --format md
   ```
4. Parse the markdown output. Preserve every URL and source tag (`reddit`, `hn`, `blogs`, `x`).
5. Summarize 3–5 themes for the user. For each theme cite at least one source by URL.

# Example

> User: "What's everyone saying about Claude 4.5?"
> → Run: `npx notslop@latest digest "Claude 4.5" --since 24h --format md`
> → Group results into themes (benchmarks, dev reactions, pricing, etc.) and return the summary with the source URLs inline.
