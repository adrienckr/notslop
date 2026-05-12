# Example: Writing a fresh tweet on Anthropic MCP

A full walkthrough of `notslop-write-post` in action. The point is to show how the digest call produces specific data points the post leans on — and what separates a grounded post from a generic one.

## Prompt

> User: "Write a tweet about what's hot on Anthropic MCP today"

## Step 1 — Read the room

Claude runs:

```bash
npx notslop@latest digest "Anthropic MCP" --since 24h --format json --top 10
```

## Step 2 — Parse top reranked posts

The digest returns ten items. The three with the highest `ze_score` are:

1. **[reddit · r/ClaudeCode]** (0.94) — "MCP server adoption is finally clicking — 12 new ones this week" — 1.2k upvotes — https://reddit.com/r/ClaudeCode/comments/1mc9xx2
2. **[hn · Front Page]** (0.91) — "Model Context Protocol becomes a de-facto standard for tool calling" — 340 points — https://news.ycombinator.com/item?id=42301188
3. **[x · @karpathy]** (0.86) — public benchmark thread on Claude 4.5 vs MCP-aware agents

## Step 3 — Draft, grounded

```
The MCP adoption curve is steeper than people think.
Last 24h in r/ClaudeCode alone:
- 12 new MCP servers shipped
- 3 "I replaced my SaaS with MCP" posts
- Karpathy benchmarking Claude 4.5 publicly

The stack is consolidating. Move accordingly.
```

276 chars. Two specific numbers, one named source, one directional claim. No hashtags, no "in today's rapidly evolving landscape."

## Step 4 — Show sources

The draft is grounded in three real posts. Claude surfaces them with the draft so the user can verify before shipping:

- https://reddit.com/r/ClaudeCode/comments/1mc9xx2 (12 servers stat)
- https://news.ycombinator.com/item?id=42301188 (de-facto standard framing)
- karpathy's X thread (the public benchmark callout)

## Why this beats a vanilla LLM draft

A vanilla LLM writes "MCP is gaining traction in the AI ecosystem!" — vague, no numbers, no URLs, indistinguishable from the other 46 LLMs writing the same tweet. The grounded version cites a count (12), names a person (Karpathy), and points at a behavior change (replacing SaaS). That's the difference between slop and signal.
