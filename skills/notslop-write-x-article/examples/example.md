# Example: X Article on MCP adoption

## User

> "Write an X Article about MCP adoption"

## Agent runs digest + pulse

```bash
notslop digest "MCP adoption" --since 30d --top 30 --for-content
```

```bash
notslop pulse "MCP adoption" --window 30d --format json
```

## Pulse themes (abbreviated)

```json
{
  "themes": [
    { "label": "registry fragmentation", "count": 87 },
    { "label": "3x Q1 adoption", "count": 61 },
    { "label": "auth inconsistency", "count": 54 },
    { "label": "community-built catalogs", "count": 38 },
    { "label": "Claude Desktop vs Cursor gaps", "count": 29 }
  ]
}
```

## Article draft (abbreviated — first paragraph of each section shown)

---

# MCP Tripled in Q1. The Ecosystem Still Hasn't Caught Up.

**[Intro]**

MCP adoption grew 3x in Q1 2025. That's the headline. The less-covered story is that every team shipping an MCP integration is also shipping its own discovery logic, its own auth wrapper, and its own server catalog. The protocol is solid. The infrastructure around it is a patchwork.

This article pulls from 30 days of discussion across HN, Reddit, and X to map where MCP actually stands — what's working, what's breaking, and what needs to consolidate before the next adoption wave.

---

## The Registry Problem Hasn't Been Solved

The loudest recurring complaint over the past 30 days: there is no canonical place to find MCP servers. 87 separate discussions described teams hand-editing JSON configs or copying snippets from Discord threads to get a server running. Karpathy's framing from last month — "it needs a pip/npm moment" — keeps getting cited because nothing has replaced it with an answer...

*[Section continues with 2 more concrete examples from digest]*

---

## Auth Is Fragmented Across Every Major Client

Claude Desktop, Cursor, and Zed each implement MCP auth differently. 54 threads in the last 30 days flagged this as the top friction point for server developers who want broad compatibility. One r/ClaudeCode thread from two weeks ago became a reference post: a developer documented the exact auth delta between the three clients and it accumulated 600+ upvotes...

*[Section continues with specific example from HN digest entry]*

---

## Adoption Is Real — Mostly Enterprise Internal Tooling

The 3x growth figure isn't hype. 61 posts cited it, and the breakdown skews toward internal tooling: teams wiring MCP servers to Jira, Notion, internal APIs. The consumer-facing story is thinner. Most public MCP demos are developer-to-developer showcases, not shipped products...

*[Section continues with concrete enterprise use case from digest]*

---

## The Community Is Building What the Ecosystem Lacks

38 discussions referenced grassroots server catalogs — GitHub repos, Notion pages, Discord pins — filling the registry gap. The most-cited one has 2,400 stars and is maintained by three people on their evenings. That's a dependency risk for an ecosystem with 3x Q1 growth...

*[Section continues]*

---

## What Needs to Happen Next

The protocol doesn't need more features. It needs consolidation on three things: a shared registry with basic vetting, a reference auth implementation that all major clients agree to, and a migration story for the teams that already built their own wrappers...

---

**[Char count: ~3,840 / 6,000 target]**

---

## Sources

1. @karpathy: "needs a pip/npm moment" — https://x.com/karpathy/status/1780000001
2. HN: "Anthropic MCP: six months in" — https://news.ycombinator.com/item?id=40012345
3. r/ClaudeCode: "MCP auth delta between clients" — https://reddit.com/r/ClaudeCode/comments/1abc123
4. r/cursor: "server works in Desktop, fails in Cursor" — https://reddit.com/r/cursor/comments/1def456
5. GitHub: community MCP server catalog (2.4k stars) — https://github.com/example/mcp-servers
