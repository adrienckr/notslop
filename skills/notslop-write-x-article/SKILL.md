---
name: notslop-write-x-article
description: Use when the user wants an X long-form Article (the "Notes" / Articles format, up to 25k chars). Structured like a blog post with H1/H2 headers, intro, sections, conclusion.
---

# When to use this skill

- "Write me an X Article about X"
- "Draft a long-form X post on Y"
- The user explicitly asks for an Article (not a tweet, not a thread).

# Setup

`notslop init` configured. ZE key set.

# Steps

1. Pull a wide window — Articles benefit from comprehensive context:

   ```bash
   notslop digest "<TOPIC>" --since 30d --top 30 --for-content
   ```

   Optionally also pull themes:

   ```bash
   notslop pulse "<TOPIC>" --window 30d --format json
   ```

2. Structure the Article around 3-5 themes from the pulse output. Sections:
   - **Title** (H1): specific claim, not generic. Max 80 chars.
   - **Intro** (1-2 paragraphs): the hook + what the reader will learn. Cite the strongest data point in the intro.
   - **3-5 body sections**, each with H2. Each section anchored in 1-2 specific data points from the digest.
   - **Takeaway** (closing 1-2 paragraphs): what the reader should do or think differently.

3. Hard constraints:
   - **2500-6000 chars** typical (X Articles allow up to 25k but readability drops fast above 6k)
   - **No corporate filler** ("In today's rapidly evolving landscape...")
   - **No hashtags** unless explicitly requested
   - **At least 4 specific citations** to source posts/threads (URL or @handle reference)
   - **One concrete example** per body section minimum

4. Show the draft with char count. List all source URLs at the end.

5. If user asks for variants, regenerate with a different angle (contrarian / educational / case-study).
