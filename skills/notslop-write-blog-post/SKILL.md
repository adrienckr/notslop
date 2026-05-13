---
name: notslop-write-blog-post
description: Use when the user wants to write a long-form blog post (1500-3000 words) on a topic. Pulls a week of social signal, clusters it into themes, identifies undercovered angles, then produces an SEO-aware article with per-section word counts, E-E-A-T citations of real posts, and citation-ready structure for AI Overviews.
---

# When to use this skill

- "Write me a blog post about X"
- "Draft a long-form article on Y for my site"
- "I need a 2000-word piece on Z"
- The user mentions blog, article, long-form, or asks for word counts >1000.

For X long-form Articles (Notes format), use `notslop-write-x-article`. For just the title + meta description, use `notslop-write-blog-headline`. For LinkedIn long-form, use `notslop-write-linkedin-post`.

# Setup

`notslop init` configured. ZeroEntropy key set.

# Steps

1. Gather inputs from the user (ask only for what's missing):
   - **Topic / focus keyword** (the primary SEO target)
   - **Target audience** (e.g. AI builders, growth marketers, devs)
   - **Target length** (default 2000 words; valid range 1500-3000)
   - **Voice/tone** (analytical / opinionated / tutorial)
   - **Author angle**: their experience or unique POV on the topic
   - **Optional**: their website / publication for tone reference

2. Research phase. Run the four commands. Pipe each to a temp file or read sequentially; do not skip any:

   ```bash
   notslop digest "<TOPIC>" --since 7d --top 15 --for-content
   ```

   ```bash
   notslop pulse "<TOPIC>" --window 7d --top 5
   ```

   ```bash
   notslop voices "<TOPIC>" --top 10 --for-content
   ```

   ```bash
   notslop find-related "<TOPIC> — <USER ANGLE>" --top 10
   ```

3. Synthesize the research before drafting. In your own working notes, identify:
   - The **3-5 dominant themes** from `pulse`
   - **5-10 quotable real posts** with URL + date + author from `digest` and `voices`
   - **2-3 undercovered angles** that the recent signal does not address
   - The **most cited claim or framing** the user could reinforce or push back on

4. Produce the **content brief BEFORE the draft**. Output a markdown block titled `## Content brief` containing:
   - **Focus keyword** (1 primary) + 2-3 secondary keywords
   - **H1** (the title — see step 5 for rules)
   - **Meta description** (155-160 chars, focus keyword in the first 100 chars)
   - **Outline**: 4-7 H2 sections, each with:
     - Section heading
     - 2-3 bullet sub-points it must cover
     - Word budget (sum of all sections within ±10% of target length)
     - Which real posts to cite in this section (URL + author)
   - **Estimated reading time** (words / 220 wpm, rounded to nearest minute)

5. Title rules (H1 + meta):
   - **50-70 chars** (hard cap 70)
   - **Front-loaded** with focus keyword
   - **Specific outcome or claim**, not "Guide to X" / "Everything you need to know about X"
   - No "10 ways", no "ultimate guide", no clickbait inflation
   - Pattern that works for AI/dev audiences: `<Specific outcome>: <how/why> <focus keyword>`

6. Write the article. Structure rules:
   - **Open with a specific, dated observation from the social signal** (gives E-E-A-T signal in the first paragraph). Example: "On May 8, @author posted that..."
   - **Each H2 section follows claim → evidence (cite real post with URL) → implication.** 200-400 words depending on the brief.
   - **Use blockquotes** for direct citations from posts.
   - **Include a `## Citations` section at the bottom** with all referenced posts (numbered, URL, author, date).
   - **Closing**: a falsifiable prediction or a specific question for the reader. Never "What do you think?".

7. Readability + SEO checks. Before showing the draft, verify and self-report:
   - **Avg sentence length <25 words.** Flag any paragraph that exceeds 100 words.
   - **Headings every 200-300 words.**
   - **Each H2 is self-contained** (an AI Overview could quote it without surrounding context). Use clear claim + evidence pattern inside each section.
   - **Focus keyword density 0.5-1.5%.** Appears in title, H1, first 100 words, 2-3 H2s, meta description.
   - **Every non-first-person claim cites a real post URL** from the digest.

8. AI-slop scan. Search the draft for these phrases. If any appear, flag them in a separate block for user review (do NOT silently delete):
   - "rapidly evolving landscape"
   - "in today's world"
   - "the future of X"
   - "leverage"
   - "robust"
   - "seamlessly"
   - "delve into"
   - "navigate the complexities"
   - "in conclusion"

# Output format

Output in this exact order:

1. The **content brief** (markdown, the full block from step 4).
2. The **full article** (markdown).
3. The **AI-slop scan results** — either "No flagged phrases found." or a numbered list of phrases + line context.
4. A **1-tweet teaser** (≤ 280 chars) the user can post on X to drive traffic to the article.

# Constraints

- No "in today's rapidly evolving landscape" or any flagged AI-slop phrase in the final draft (flag, don't auto-edit; the user decides).
- Every claim that isn't first-person experience must cite a real post URL from the digest. No inventing sources.
- Avg sentence length <25 words. Flag any paragraph >100 words.
- Reading time displayed once at the top of the article.
- If the user explicitly asks for an opinion piece (no citations), keep E-E-A-T via first-person experience markers ("I ran into this when...", "We shipped X and saw Y") and skip the `## Citations` section.
- Word count must land within ±10% of the user's target.
- No emojis unless the user asks.
- No hashtags.
