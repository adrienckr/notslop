---
name: notslop-write-linkedin-post
description: Use when the user wants a LinkedIn post. Pulls 7-day digest, writes a 1000-1300 char post with line breaks, one hook line, 2-3 data points, takeaway.
---

## Providers required

| Capability | Required | Providers (BYOK) | Setup | Cost |
|---|---|---|---|---|
| Pull social signal (Reddit/HN/blogs) | yes | built-in, no key needed | — | free |
| Rerank by relevance | yes | ZeroEntropy `zerank-2` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Embed for cross-source dedup | yes | ZeroEntropy `zembed-1` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Scrape X posts | **only if topic needs X data** | Orthogonal (ScrapeCreators) | [PROVIDERS.md#x-twitter--via-orthogonal](../../PROVIDERS.md#x-twitter--via-orthogonal) | ~$0.02/handle, $10 free at signup |

# When to use this skill

- "Write me a LinkedIn post about X"
- "Draft a LinkedIn update on Y"
- The user mentions LinkedIn explicitly.

# Setup

`notslop init` configured.

# Steps

1. Pull a 7-day window — LinkedIn favors slightly longer-horizon insights than X:

   ```bash
   notslop digest "<TOPIC>" --since 7d --top 15 --for-content
   ```

2. Write the post following LinkedIn's format:
   - **Hook (line 1)**: a punchy claim or surprising number. Single line, no period at end (encourages "see more" expansion).
   - **Blank line.**
   - **2-3 body paragraphs**, each grounded in a specific data point. Use line breaks between sentences (LinkedIn rewards readability).
   - **Final takeaway line**: what the reader should do or think differently.
   - **Optional**: 1 question for engagement (only if user wants more reach).

3. Hard constraints:
   - **1000-1300 chars** total (LinkedIn's sweet spot)
   - **No hashtags** unless asked (the algorithm doesn't reward them anymore)
   - **No emojis** unless asked
   - **No "I'm thrilled to announce" corporate speak**
   - **No "In today's fast-paced world" generic opens**
   - Reference specific sources (companies, threads, numbers)

4. Show draft + char count + 3 source URLs.
