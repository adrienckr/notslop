---
name: notslop-write-reddit-post
description: Use when the user wants to write a new Reddit post (title + body) for a specific subreddit. Adapts tone to the sub culture, grounds in current activity, avoids self-promotion patterns.
---

## Providers required

| Capability | Required | Providers (BYOK) | Setup | Cost |
|---|---|---|---|---|
| Pull social signal (Reddit/HN/blogs) | yes | built-in, no key needed | — | free |
| Rerank by relevance | yes | ZeroEntropy `zerank-2` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Embed for cross-source dedup | yes | ZeroEntropy `zembed-1` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Scrape X posts | no | — | — | — |

# When to use this skill

- "Write a Reddit post on r/<sub> about X"
- "Help me post on r/<sub>"
- The user provides a target subreddit and a topic.

For REPLIES to an existing thread, use `notslop-write-reddit-reply` instead.

# Setup

`notslop init` configured.

# Steps

1. Pull sub-scoped fresh signal:

   ```bash
   notslop digest "<TOPIC>" --sources reddit --since 7d --top 15 --for-content
   ```

   If the user wants posts narrowed to a specific subreddit, look at the user's config (or pass `--subreddits` if available).

2. Read the digest carefully — what's the **culture** of the sub? Casual? Highly technical? Skeptical of vendors? Adopt tone accordingly.

3. Write the post with these constraints:
   - **No self-promotion patterns**: no "check out my X", no shill links, no "I built a tool that solves this" lead-ins.
   - **First person OK** when sharing experience.
   - **Cite at least one current post in the sub** by paraphrasing it (shows you've read the room).
   - **Title** is half the work: specific, not clickbait. Max 80 chars typical.
   - **Body**: 200-600 chars.
   - **No emojis** unless the sub uses them heavily.

4. Show the draft. Suggest 1-2 alternate titles.
