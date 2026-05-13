---
name: notslop-write-cold-dm
description: Use when the user wants to write a cold DM to someone on Twitter/X or LinkedIn — pulls the recipient's recent posts via notslop and grounds the DM in something specific they said. Outputs a message that respects the recipient's time and references a real thing, not generic flattery.
---

# When to use this skill

- "Write a cold DM to @<handle>"
- "Help me reach out to <person> on Twitter/LinkedIn"
- "Draft an intro DM to <person> asking for <thing>"
- The user mentions cold outreach, DM, or reaching out to someone specific.

For Reddit replies, use `notslop-write-reddit-reply`. For broad-audience tweets, use `notslop-write-x-tweet`.

# Setup

`notslop init` configured. ZeroEntropy key set.

# Steps

1. Ask the user (if not already provided):
   - Recipient handle (e.g. `@karpathy`) or full name
   - Goal of the DM: intro, ask for feedback, pitch a project, ask for an intro to someone, etc. Be specific — "build a relationship" is not a goal.
   - Platform: X (Twitter) or LinkedIn
   - Who the user is (1 line — needed for the sign-off context)

2. Pull the recipient's recent thinking. Try in this order:

   - If the recipient has a configured voices/list entry, use it:
     ```bash
     notslop voices "<recipient handle or topic>" --top 10 --for-content
     ```
   - Otherwise add a temp X list scoped to the recipient, then digest it:
     ```bash
     notslop list add temp_dm --kind x_profiles --items <handle>
     notslop digest "<topic the recipient cares about>" --list temp_dm --since 30d --top 10 --for-content
     ```
   - As a fallback (no X profile / LinkedIn only): digest on their name/topic:
     ```bash
     notslop digest "<recipient name>" --since 30d --top 10 --for-content
     ```

3. Read the output. **If the recipient hasn't posted in 30 days**, stop and suggest the user pick someone else — there's no signal to ground in.

4. Pick **1 specific recent post or theme** the recipient has been engaging with. Quote or paraphrase it.

5. Write the DM. Structure:
   - **Greeting**: first name only. No "Hey there", no "Hi <handle>".
   - **Hook (1-2 sentences)**: reference the specific recent post or theme. Show you actually read it — paraphrase a point, push back gently, or extend it.
   - **The ask (1-2 sentences)**: what you want, time-bounded. "5-min feedback on X" / "intro to your CTO if it makes sense" / "your take on Y".
   - **Sign-off**: first name + one-line context about who you are. No "best regards", no email signature block.

6. Length cap: **50-90 words total**. Twitter DM tolerates 1000 chars but tight wins. LinkedIn DMs have a 300-char preview — keep the hook in the first 200 chars.

7. Show the draft. Below it, print the 1 source post you grounded in (URL or quoted line).

# Output format

Print:
1. The DM text.
2. Word count.
3. The 1 source post / theme you grounded in.

# Constraints

- **Never** say "I love your work", "huge fan", "your content has been so impactful", "your thread on X changed my life". Show, don't tell — reference the specific post.
- No "quick question", "got a sec", "hope you're well", "sorry to bother you".
- No 5-paragraph essays. If the ask needs more than 90 words, it needs a different channel (email, intro request).
- No links in the first DM unless the user explicitly wants to share a demo (and even then, prefer waiting for a reply).
- No emojis unless the user asks.
- If the recipient hasn't posted in 30 days, refuse and suggest another target.
- Sign off with the user's first name and one short identity line (e.g. "Adrien — building Karmable, a Reddit growth tool"). No tagline-style boast.
