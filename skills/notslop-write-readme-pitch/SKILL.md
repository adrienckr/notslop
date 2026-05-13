---
name: notslop-write-readme-pitch
description: Use when the user wants to write or improve the top section of a README for an open-source project — the part above the fold that convinces a developer to keep reading. Pulls competitor READMEs + recent traction signals to ground positioning.
---

# When to use this skill

- "Write me a README hero for <repo>"
- "Improve the top of my README"
- "Draft the above-the-fold for my open-source project"
- The user mentions README, hero section, or repo landing.

For Show HN launch posts, use `notslop-write-show-hn-post` instead.

# Setup

`notslop init` configured. ZeroEntropy key set.

# Steps

1. Ask the user (if not already provided):
   - Repo name
   - What it does in one sentence
   - Language / stack
   - License
   - Install command (e.g. `npm install x`, `pip install x`, `brew install x`)
   - Key competitor repos (optional — helps with the "why it's different" section)

2. Read what's resonating in the niche:

   ```bash
   notslop digest "github <topic>" --since 30d --top 10 --for-content
   ```

3. Surface comparable repos:

   ```bash
   notslop find-related "<repo description>" --top 5
   ```

4. Draft the README hero in markdown. Order:

   ```markdown
   # <RepoName>

   **<One-line tagline, <100 chars, no emoji>**

   ![License](placeholder) ![Language](placeholder) ![CI](placeholder)

   <3-sentence plain prose: what it is, who it's for, what makes it different.>

   ## Quickstart

   ```bash
   <install command>
   <minimal usage example, 3-5 lines max>
   ```

   ## Why <RepoName>

   - <Differentiator 1 — contrast with a real competitor approach>
   - <Differentiator 2 — concrete capability, not adjective>
   - <Differentiator 3 — optional>
   ```

5. Show the draft. Suggest **2 alternative taglines**.

# Output format

Print:
1. The full markdown hero (everything from `# Title` through `## Why`).
2. 2 alternate taglines.
3. 2-3 competitor repos you cited (from the digest), so the user can verify the framing is fair.

# Constraints

- **Quickstart must be 5 lines max** in the code block (excluding the install line). If it can't fit, link to a longer "Getting started" section instead.
- No "blazingly fast", "modern", "powerful", "robust", "lightweight", "next-generation", "battle-tested".
- No emojis in the tagline. Badges count as visual, not emoji.
- The hero must read well on **GitHub mobile preview** — assume the user is reading on a phone in a Slack thread. Keep paragraphs short.
- "Why <repo>" bullets must contrast with **real alternatives**, not strawmen. Cite specific competitor repos from the digest when appropriate.
- Don't list features as adjectives. Lead with verbs and outcomes.
- License badge, language badge, CI badge are placeholders — let the user fill in URLs.
