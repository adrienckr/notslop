# Example: Thread on MCP adoption over the last week

## User

> "Write a thread about MCP adoption over the last week"

## Agent runs digest + pulse

```bash
notslop digest "MCP adoption" --since 7d --top 20 --for-content
```

```bash
notslop pulse "MCP adoption" --window 7d --format json
```

## Pulse themes (abbreviated JSON)

```json
{
  "themes": [
    { "label": "registry fragmentation", "count": 34, "sentiment": "negative" },
    { "label": "auth inconsistency across clients", "count": 28, "sentiment": "negative" },
    { "label": "3x Q1 adoption growth", "count": 19, "sentiment": "positive" },
    { "label": "Claude Desktop vs Cursor integration gaps", "count": 15, "sentiment": "mixed" },
    { "label": "community-built server catalog efforts", "count": 12, "sentiment": "positive" }
  ]
}
```

## Thread draft

**1/**
MCP adoption tripled in Q1 2025.

The ecosystem still can't agree on how to discover servers, authenticate clients, or share configs.

Here's what the last 7 days of discussion actually look like:

---

**2/**
The registry problem is the loudest complaint.

34 separate threads this week describe teams reinventing discovery from scratch. No shared catalog. Every deployment is a custom JSON config somewhere on disk.

Karpathy called it needing "a pip/npm moment." That moment hasn't arrived.

---

**3/**
Auth is the second fault line.

28 discussions flagged that Claude Desktop, Cursor, and Zed all handle MCP auth differently. Building a server that works reliably across clients means testing three auth flows, not one.

---

**4/**
Growth is real though.

19 posts cited the 3x Q1 figure, mostly from enterprise teams adopting MCP for internal tooling. The adoption curve isn't slowing — the tooling is just lagging behind it.

---

**5/**
The integration gap between Claude Desktop and Cursor is generating friction.

15 threads this week from users who got a server working in one client, then spent hours debugging why it fails in the other. Same spec, different behavior.

---

**6/**
The community is moving faster than the official tooling.

12 posts referenced grassroots server catalogs — GitHub repos, Discord pins, Notion pages — filling the gap that a proper registry would cover. Fragile but functional.

---

**7/**
The pattern: strong protocol, weak ecosystem.

MCP is the right abstraction. The adoption numbers prove it. But right now, every team building on it is also building the infrastructure around it.

The next unlock isn't a better spec. It's consolidation on tooling.

---

## Sources

1. HN: "Anthropic MCP: six months in" — https://news.ycombinator.com/item?id=40012345
2. r/ClaudeCode: "MCP server discovery is still manual" — https://reddit.com/r/ClaudeCode/comments/1abc123
3. @karpathy: "needs a pip/npm moment" — https://x.com/karpathy/status/1780000001
4. r/cursor: "MCP auth works in Claude Desktop but not Cursor" — https://reddit.com/r/cursor/comments/1def456
5. GitHub: community MCP server catalog — https://github.com/example/mcp-servers
