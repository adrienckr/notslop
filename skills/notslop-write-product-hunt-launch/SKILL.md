---
name: notslop-write-product-hunt-launch
description: Use when the user wants to write a ProductHunt launch — tagline, first comment, and feature highlights. Pulls recent successful PH launches in the same category to ground positioning and ship-quality copy.
---

## Providers required

| Capability | Required | Providers (BYOK) | Setup | Cost |
|---|---|---|---|---|
| Pull social signal (Reddit/HN/blogs) | yes | built-in, no key needed | — | free |
| Rerank by relevance | yes | ZeroEntropy `zerank-2` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Embed for cross-source dedup | yes | ZeroEntropy `zembed-1` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Scrape X posts | **only if topic needs X data** | Bright Data Datasets API | [PROVIDERS.md#x-twitter--via-bright-data](../../PROVIDERS.md#x-twitter--via-bright-data) | ~$0.001/post |

# When to use this skill

- "Write me a Product Hunt launch for X"
- "Help me launch <product> on PH"
- "Draft my Product Hunt tagline and maker comment"
- The user mentions ProductHunt or PH launch.

For Hacker News launches, use `notslop-write-show-hn-post` instead.

# Setup

`notslop init` configured. ZeroEntropy key set.

# Steps

1. Ask the user (if not already provided):
   - Product name
   - What it does in 1 sentence
   - Category (e.g. "developer tools", "AI", "productivity", "marketing")
   - Demo URL
   - Key differentiator vs competitors (1-2 sentences)
   - Launch date

2. Read the room for recent launches in the same category:

   ```bash
   notslop digest "product hunt <category>" --since 7d --top 10 --for-content
   ```

3. Find semantically similar launches:

   ```bash
   notslop find-related "<user's product description>" --top 5
   ```

4. Write three artifacts.

   **a. Tagline** (`<60 chars`, no emoji)

   Action-oriented, no fluff. Show **3 variants** so the user can pick.

   Good: "Ship Reddit campaigns from one dashboard."
   Bad: "The next-gen platform for Reddit growth."

   **b. First comment (maker note)** (~150-250 words)

   Structure:
   - The story (1-2 sentences): why you built it. First person.
   - What you built (2-3 sentences): what it does in plain words.
   - What's free vs paid (1 sentence): be explicit. "100 free credits / unlimited self-host / free during launch week / etc."
   - Link to demo.
   - Ask for specific feedback (1 sentence): one concrete question, not "let me know what you think".
   - Availability (1 line): "I'll be here answering questions all day."

   **c. Feature highlights** (3-5 bullets)

   Each `<80 chars`, benefit-first. Lead with the outcome, not the mechanism.

   Good: "Schedule replies across 50 accounts in one click"
   Bad: "Uses our proprietary scheduling engine"

5. Show all three artifacts. Cite 2-3 PH launches from the digest you drew tone from.

# Output format

Print:
1. **Taglines** — 3 variants.
2. **Maker comment** — full text.
3. **Feature highlights** — bullet list.
4. **Reference launches** — 2-3 lines, with URLs.

# Constraints

- No emojis in the tagline.
- The maker comment can have ONE rocket or sparkle emoji if it fits naturally — never more. Default to zero.
- No "Excited to launch", "Thrilled to share", "Without further ado".
- Mention the free tier explicitly when relevant (PH audience cares).
- Always include the maker availability line ("I'll be answering questions all day" or similar).
- No "the only X that does Y" overclaims.
- No "AI-powered" filler — say what the AI actually does.
- Feature bullets must lead with a verb or outcome, not a noun.
