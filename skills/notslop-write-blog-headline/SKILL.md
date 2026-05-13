---
name: notslop-write-blog-headline
description: Use when the user wants 5-10 candidate H1 titles + meta descriptions for a blog post, SEO-optimized for a focus keyword. Faster than `notslop-write-blog-post`; produces titles only, no body.
---

## Providers required

| Capability | Required | Providers (BYOK) | Setup | Cost |
|---|---|---|---|---|
| Pull social signal (Reddit/HN/blogs) | yes | built-in, no key needed | — | free |
| Rerank by relevance | yes | ZeroEntropy `zerank-2` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Embed for cross-source dedup | yes | ZeroEntropy `zembed-1` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Scrape X posts | **only if topic needs X data** | Bright Data Datasets API | [PROVIDERS.md#x-twitter--via-bright-data](../../PROVIDERS.md#x-twitter--via-bright-data) | ~$0.001/post |

# When to use this skill

- "Give me 8 title options for a post about X"
- "Rewrite this headline for SEO"
- "Help me title my blog post on Y"
- The user wants titles only, not a full article.

For the full article (1500-3000 words), use `notslop-write-blog-post`. For X / LinkedIn post hooks, use the platform-specific skills.

# Setup

`notslop init` configured. ZeroEntropy key set.

# Steps

1. Gather inputs (ask only for what's missing):
   - **Focus keyword**
   - **One-line description** of what the post is about (or, if the post exists, the current H1 + first 200 words)
   - **Audience**
   - **Tone**: analytical / contrarian / curious / tutorial
   - **Optional**: current title to rewrite

2. Research phase:

   ```bash
   notslop digest "<FOCUS_KEYWORD>" --since 30d --top 20 --for-content
   ```

   ```bash
   notslop find-related "<USER BRIEF>" --top 10
   ```

3. Read the research and identify:
   - **2-3 headline patterns** that are working in this niche right now
   - **Over-covered angles** to avoid
   - **Specific outcomes / numbers / contrarian takes** that are getting engagement

4. Generate **8 candidate titles in a markdown table**:

   ```
   | # | Title | Chars | Pattern | Why |
   |---|---|---|---|---|
   | 1 | <title> | 67 | specific-outcome | references the X% finding from <post> |
   ```

   Use this exact pattern mix:
   - **2 specific-outcome** ("How <X> got from 0 to <N> on <metric>")
   - **2 contrarian** / disagreeing-with-consensus
   - **2 explainer** / tutorial framing
   - **1 question** (open-ended but specific)
   - **1 list** (only if it adds value — never "10 ways")

5. For each title, generate the matching **meta description**:
   - 155-160 chars
   - Focus keyword in the first 100 chars
   - Action-oriented (verb-led) or a specific claim
   - No marketing fluff

6. Rank the **top 3** by:
   - **SEO strength** (focus keyword position, length sweet spot 55-65 chars)
   - **Click-worthiness** (specific > vague)
   - **Truth-fit** (matches what the user said they're writing about)

# Output format

Output in this exact order:

1. The **full table of 8 titles + meta descriptions** (one row per title, meta description in a second column or row beneath).
2. The **ranked top 3** with a 1-line justification each.
3. A note on **which competing posts (from the digest) use similar headlines** so the user can differentiate. List 2-3 with URLs.

# Constraints

- **Hard cap 70 chars** on titles (Google SERP truncation).
- **Hard cap 160 chars** on meta descriptions.
- No "Ultimate", no "Definitive", no "Complete".
- Every title must contain the **focus keyword OR an exact synonym**.
- Don't repeat the same pattern twice.
- No emojis. No hashtags.
- No "leverage", "seamless", "robust", "powerful", "rapidly evolving".
