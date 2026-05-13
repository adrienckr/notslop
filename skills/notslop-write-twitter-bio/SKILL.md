---
name: notslop-write-twitter-bio
description: Use when the user wants to write or rewrite their Twitter/X bio (160 char hard cap) or LinkedIn headline. Pulls what's working in their niche to ground positioning.
---

## Providers required

| Capability | Required | Providers (BYOK) | Setup | Cost |
|---|---|---|---|---|
| Pull social signal (Reddit/HN/blogs) | yes | built-in, no key needed | — | free |
| Rerank by relevance | yes | ZeroEntropy `zerank-2` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Embed for cross-source dedup | yes | ZeroEntropy `zembed-1` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Scrape X posts | **only if topic needs X data** | Orthogonal (ScrapeCreators) | [PROVIDERS.md#x-twitter--via-orthogonal](../../PROVIDERS.md#x-twitter--via-orthogonal) | ~$0.02/handle, $10 free at signup |

# When to use this skill

- "Rewrite my Twitter bio"
- "Help me with my X bio / LinkedIn headline"
- "Draft a new bio for me"
- The user mentions bio, headline, or positioning copy.

For long-form positioning (about page, README hero), use `notslop-write-readme-pitch`.

# Setup

`notslop init` configured. ZeroEntropy key set.

# Steps

1. Ask the user (if not already provided):
   - Niche / topic they want to be known for (e.g. "LLM agents", "indie SaaS", "fintech")
   - Current role / title
   - What they're shipping or working on right now
   - Links to include (note: 1 URL belongs in the website field, NOT the bio text)

2. See how top voices in the niche describe themselves:

   ```bash
   notslop voices "<niche>" --top 10 --for-content
   ```

3. See the current lingo in the space:

   ```bash
   notslop digest "<niche>" --since 7d --top 5 --for-content
   ```

4. Draft **5 bio variants** in markdown. One of each style:

   - **Observational** — "watching X grow, building Y". Implies expertise without claiming it.
   - **Declarative** — "I do X. Currently shipping Y." Clean, no fluff.
   - **Specific-results** — "Took X from 0 to N — sharing what I learned." Numbers ground it.
   - **Playful** — one specific in-joke from the niche (only works if the user is plugged in). Optional emoji if it carries meaning.
   - **Contrarian** — positioning against a common take in the niche. Stakes a claim.

5. Each variant: **hard cap 160 chars** (count carefully — X enforces it, no exceptions). For LinkedIn headlines, cap at 220 chars instead.

# Output format

Print:
1. All 5 variants, labeled by style, each with its character count `[123/160]`.
2. 2-3 reference bios from the voices output (1 line each) so the user sees what landed in the niche.

Example output:

```
**Observational** [142/160]
Watching agentic coding tools eat the IDE. Shipping <X> — making cold outreach feel less like spam. Ex-<role>.

**Declarative** [98/160]
I build growth tools for AI startups. Currently shipping Karmable. ZeroEntropy growth on the side.
```

# Constraints

- **160 char hard cap** for X bios (220 for LinkedIn headlines). Count carefully.
- **No emoji-stuffed bios**. ONE emoji max, and only if it adds meaning (e.g. a flag for nationality, a niche-specific icon). Default to zero.
- **No "🚀 Founder | 💼 Investor | ✍️ Writer"** style pipe-separated role lists.
- **Pick ONE positioning** — don't try to be three things. Bios that list every role read as unfocused.
- **Don't put a URL in the bio text**. The URL goes in the dedicated website field. Mentioning it in the bio wastes characters and looks amateur.
- **No "passionate about"**, "lifelong learner", "thoughts are my own", "DMs open".
- **No "ex-Google, ex-Stripe, ex-…"** unless the user explicitly wants that pedigree framing.
- If the user provides a number (followers, ARR, downloads), prefer the specific-results variant and put the number in it.
