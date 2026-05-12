---
name: notslop-repurpose
description: Use when the user has an existing post (tweet, blog, Reddit thread) and wants variants for other platforms, with fresh related context layered in.
---

# When to use this skill

- "Repurpose this tweet for LinkedIn"
- "Turn this blog post into a Reddit thread for r/<sub>"
- "Adapt this thread for [other platform]"
- The user provides a URL or pastes the source content + a target platform.

# Setup

Same as `notslop-write-post`: requires `notslop init` and a ZeroEntropy key.

# Steps

1. Read the source content. If it's a URL, fetch via Bash:
   ```bash
   curl -sL "<URL>" | head -100   # or use a more targeted fetch
   ```
   If the user pasted the content directly, use that.

2. Identify the core insight (the ONE thing the post is saying). Strip the platform-specific framing.

3. **Pull current social context on the topic** (so the adapted version stays grounded in what's happening now, not just the original's snapshot):
   ```bash
   npx notslop@latest digest "<KEY TOPIC FROM SOURCE>" --since 7d --format json --top 5
   ```

4. **Write the adapted version** for each target platform the user asked for. The adapted version:
   - Keeps the core insight
   - Adopts the target platform's format and tone
   - Layers in 1-2 fresh data points from the recent digest (so it feels current, not recycled)
   - Avoids the original's exact phrasing (recognizable repost = bad)

5. Show all variants. Highlight where you added fresh context.

# Example

> User: "Repurpose https://x.com/karpathy/status/123 for LinkedIn"

→ Read source: karpathy's quick benchmark thread on Claude 4.5
→ Identify insight: "4.5 is better at code but slower"
→ Bash: `npx notslop@latest digest "Claude 4.5 benchmark" --since 7d --format json --top 5`
→ Find: 2 more recent benchmarks discussing same trade-off
→ Write LinkedIn version: longer-form, professional tone, cites Karpathy + 2 newer threads, calls out the trade-off concretely

LinkedIn draft (~1100 chars):

```
Claude 4.5 is better at code but noticeably slower. That's the trade-off Karpathy flagged on X last week, and the follow-up data is starting to confirm it.

Three data points from the last 7 days:
- Karpathy's bench: ~18% improvement on multi-step coding tasks, ~30% latency increase
- An r/LocalLLaMA thread reproducing the result on a 6-file refactor
- An HN comment from a YC engineer reporting the same pattern in production

The pricing change on Sonnet pushed people to test 4.5 in workloads where they previously used Haiku. Latency lands differently when the work is interactive vs batch. Worth measuring on your own stack before committing.
```

See [`examples/example.md`](./examples/example.md) for the full walkthrough.
