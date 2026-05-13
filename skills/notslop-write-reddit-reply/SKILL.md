---
name: notslop-write-reddit-reply
description: Use when the user wants to write a reply to an existing Reddit thread. Reads the thread + sub culture, drafts a comment grounded in current context.
---

## Providers required

| Capability | Required | Providers (BYOK) | Setup | Cost |
|---|---|---|---|---|
| Pull social signal (Reddit/HN/blogs) | yes | built-in, no key needed | — | free |
| Rerank by relevance | yes | ZeroEntropy `zerank-2` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Embed for cross-source dedup | yes | ZeroEntropy `zembed-1` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Scrape X posts | no | — | — | — |

# When to use this skill

- "Reply to <reddit URL>"
- "Help me respond to this Reddit thread"
- The user provides a Reddit thread URL (not a topic to post about).

For making a NEW post (title + body), use `notslop-write-reddit-post` instead.

# Setup

`notslop init` configured.

# Steps

1. Read the thread (and its top comments) — fetch the JSON via Bash:

   ```bash
   curl -s -A "notslop/0.3" "<REDDIT_URL>.json" | head -c 50000
   ```

   The .json suffix is Reddit's public read-only API. Parse the post + top 20 comments.

2. Identify the parent comment the user wants to reply to (ask if ambiguous). Read its tone, position, and what would actually add value vs add noise.

3. Pull current sub-scoped context for adjacent posts in the last 30 days:

   ```bash
   notslop digest "<KEY_TERMS_FROM_THREAD>" --sources reddit --since 30d --top 10 --for-content
   ```

   This gives evidence to cite from other recent discussions.

4. Write the reply. Constraints:
   - **100-400 chars** typical. Match the thread's reply lengths.
   - **No "great question!" / "this is interesting because..."** filler openings.
   - **First-person OK** for personal experience.
   - **Cite at most one other thread** to add evidence (overdoing it reads like content marketing).
   - **No self-promotion**. No "I built X that solves this".
   - **Match sub culture**: r/MachineLearning expects rigor; r/LocalLLaMA tolerates casualness; r/programming punishes hype.

5. Show the draft. Note the parent comment URL for context.
