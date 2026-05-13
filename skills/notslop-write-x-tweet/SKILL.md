---
name: notslop-write-x-tweet
description: Use when the user wants to draft a single tweet on a topic. Pulls fresh signal via notslop, then writes a tweet grounded in 1-2 specific data points. 280-char hard cap.
---

## Providers required

| Capability | Required | Providers (BYOK) | Setup | Cost |
|---|---|---|---|---|
| Pull social signal (Reddit/HN/blogs) | yes | built-in, no key needed | — | free |
| Rerank by relevance | yes | ZeroEntropy `zerank-2` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Embed for cross-source dedup | yes | ZeroEntropy `zembed-1` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Scrape X posts | **only if topic needs X data** | Orthogonal (ScrapeCreators) | [PROVIDERS.md#x-twitter--via-orthogonal](../../PROVIDERS.md#x-twitter--via-orthogonal) | ~$0.02/handle, $10 free at signup |

# When to use this skill

- "Write me a tweet about X"
- "Draft a tweet on Y for me"
- "Tweet about <topic>"

If the user explicitly asks for a Twitter/X thread, use `notslop-write-x-thread` instead. For long-form X (Articles/Notes), use `notslop-write-x-article`.

# Setup

The user must have run `notslop init` and configured a ZeroEntropy API key.

# Steps

1. Read the room via Bash, using `--for-content` for a token-efficient response:

   ```bash
   notslop digest "<TOPIC>" --since 24h --top 10 --for-content
   ```

2. Read the digest output. Pick **2 specific data points** to ground the tweet in (a concrete number, a quote, an observation from real posts).

3. Write the tweet. Hard constraints:
   - **≤ 280 chars** (count carefully).
   - **No hashtags** unless the user explicitly asks.
   - **No "In today's rapidly evolving landscape" generic openers**.
   - **No emojis** unless the user asks.
   - Reference the 2 data points concretely.
   - End with a takeaway or angle, not a "what do you think?" filler.

4. Show the draft to the user. Below it, list the 2 sources you grounded in (1 line each, with URL).

5. If the user asks for variants, regenerate with a different tone (analytical / contrarian / casual / declarative).
