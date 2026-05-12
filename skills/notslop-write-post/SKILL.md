---
name: notslop-write-post
description: Use when the user wants to write a post (tweet, LinkedIn, Reddit, blog) on a current topic. Pulls fresh social context via notslop, then writes the post grounded in real signal.
---

# When to use this skill

- "Write me a tweet about X"
- "Draft a LinkedIn post on Y"
- "Help me write a Reddit reply to <thread>"
- "Generate content about <topic>"

If the user provides a topic and a target platform, this is the skill.

# Setup (one-time)

The user must have run `npx notslop init` and configured a ZeroEntropy API key (free at https://dashboard.zeroentropy.dev).

# Steps

1. **Read the room first.** Run via Bash:
   ```bash
   npx notslop@latest digest "<TOPIC>" --since 24h --format json --top 10
   ```

2. Parse the JSON. Extract the top 5-10 posts with their source, title, key takeaway, and URL.

3. **Write the post grounded in that real signal.** The post must:
   - Cite at least 2 specific data points from the digest (numbers, quotes, observations from real posts)
   - Match the target platform's format constraints (X: 280 chars; LinkedIn: 1300 chars optimal; Reddit: match the sub's culture; blog: 600-1000 words)
   - Avoid hashtags unless the user requests them
   - Avoid generic LLM-speak ("In today's rapidly evolving landscape...")
   - Adopt the tone the user asked for (default: insightful but not preachy)

4. Show the draft to the user. Mention the 2 source posts you grounded it in (with URLs).

5. If the user asks for variants, regenerate with different tones (contrarian, casual, analytical).

# Example

> User: "Write a tweet about what's hot on Anthropic MCP today"

→ Bash: `npx notslop@latest digest "Anthropic MCP" --since 24h --format json --top 10`

→ Top reranked posts include:
  - [reddit/r/ClaudeCode] "12 new MCP servers shipped this week" (1.2k upvotes)
  - [hn] "Sonnet 4.5 pricing change debate" (340 points)
  - [x/@karpathy] benchmark thread on Claude 4.5

→ Draft:
  ```
  The MCP adoption curve is steeper than people think.
  Last 24h in r/ClaudeCode alone:
  - 12 new MCP servers shipped
  - 3 "I replaced my SaaS with MCP" posts
  - Karpathy benchmarking Claude 4.5 publicly

  The stack is consolidating. Move accordingly.
  ```
  Sources: 2 reddit threads, 1 X post

See [`examples/example.md`](./examples/example.md) for a full walkthrough.
