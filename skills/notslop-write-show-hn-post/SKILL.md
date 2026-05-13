---
name: notslop-write-show-hn-post
description: Use when the user wants to write a Show HN launch post for a new project / tool / library / SaaS. Pulls the room temperature of recent successful Show HN posts in the same niche to ground tone + format. Produces a title (<80 chars) and a body that includes problem, what-it-does, stack, demo URL, repo URL.
---

# When to use this skill

- "Write me a Show HN post for X"
- "Help me launch <project> on Hacker News"
- "Draft a Show HN for my <thing>"
- The user mentions Hacker News, Show HN, or HN launch.

For ProductHunt launches, use `notslop-write-product-hunt-launch` instead. For README hero copy, use `notslop-write-readme-pitch`.

# Setup

`notslop init` configured. ZeroEntropy key set.

# Steps

1. Ask the user (if not already provided):
   - Project name
   - What it does in 1 sentence
   - Demo URL
   - Repo URL
   - Stack (language / framework / key dependencies)
   - Target niche / topic (e.g. "developer tools", "LLM agents", "Postgres")

2. Read the room. Pull recent Show HN posts in the same niche:

   ```bash
   notslop digest "show hn <niche>" --since 7d --top 10 --for-content
   ```

   Read carefully — note what titles got traction, what tone landed, what people in this niche actually care about, what skepticism shows up in comments.

3. Optional but recommended — find semantically similar recent launches:

   ```bash
   notslop find-related "<user's 1-sentence pitch>" --top 5
   ```

4. Write the post.

   **Title** (`<80 chars`, no emojis):
   ```
   Show HN: <Name> – <one-line value prop>
   ```

   **Body** (markdown, ~200-400 words):
   - **Paragraph 1 (1-2 lines)**: the problem you hit. Concrete, first-person.
   - **Paragraph 2 (1-2 lines)**: what the project does + the technical choice that matters (mention the stack and why).
   - **Paragraph 3 (1-2 lines)**: demo URL + repo URL + license.
   - **Closing**: what kind of feedback you're hoping to get. One specific question, not "what do you think?". E.g. "I'm especially curious whether the <X design choice> holds up at <Y scale>."

5. Show the draft. Provide **2-3 title variants** below it.

# Output format

Print:
1. The chosen title.
2. The body (markdown).
3. 2-3 alternate titles.
4. 2-3 reference points from the digest you grounded in (1 line each, with URL).

# Constraints

- No emojis. No "🚀". No "Excited to share".
- No hashtags.
- No "the future of X", "rapidly evolving landscape", "leverage", "robust", "seamless", "powerful".
- Don't oversell. HN punishes marketing tone — be matter-of-fact about what works and what doesn't yet.
- Reference at least one specific observation from the digest (e.g. "I noticed a lot of Show HN posts in this space talk about <thing> — I wanted to address <related thing>").
- If the project is paid / has a paid tier, say so upfront and explain the free tier explicitly.
- Title format must start with `Show HN:` followed by the project name.
