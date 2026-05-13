---
name: notslop-write-x-thread
description: Use when the user wants to draft an X thread (multi-tweet sequence). Pulls digest + clusters + writes 5-8 tweets, each grounded in a specific data point.
---

## Providers required

| Capability | Required | Providers (BYOK) | Setup | Cost |
|---|---|---|---|---|
| Pull social signal (Reddit/HN/blogs) | yes | built-in, no key needed | — | free |
| Rerank by relevance | yes | ZeroEntropy `zerank-2` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Embed for cross-source dedup | yes | ZeroEntropy `zembed-1` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Scrape X posts | **only if topic needs X data** | Bright Data Datasets API | [PROVIDERS.md#x-twitter--via-bright-data](../../PROVIDERS.md#x-twitter--via-bright-data) | ~$0.001/post |

# When to use this skill

- "Write me a thread about X"
- "Draft an X/Twitter thread on Y"
- "Thread about <topic>"
- The user explicitly asks for a thread (3+ tweets).

# Setup

`notslop init` configured. ZeroEntropy key set.

# Steps

1. Pull a wider window than single-tweet — threads benefit from broader context:

   ```bash
   notslop digest "<TOPIC>" --since 7d --top 20 --for-content
   ```

2. Optionally also pull themes via:

   ```bash
   notslop pulse "<TOPIC>" --window 7d --format json
   ```

   Use the `themes` array from the JSON to structure the thread arc (one tweet per top theme).

3. Write 5-8 tweets total. Structure:
   - **Tweet 1**: hook with the strongest specific number or observation. No "Thread:" or thread emoji lead-in.
   - **Tweets 2-N**: one specific data point per tweet, with one-line analysis.
   - **Last tweet**: synthesis or actionable takeaway. No "follow me for more" filler.

4. Hard constraints per tweet:
   - ≤ 280 chars each
   - Reference a source if claiming a specific number
   - No hashtags
   - No emojis unless asked

5. Show the thread numbered (1/, 2/, etc.). List source URLs at the end as a "Sources" footer.
