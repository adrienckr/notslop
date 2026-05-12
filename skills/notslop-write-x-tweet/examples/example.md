# Example: Tweet about Anthropic MCP

## User

> "Write me a tweet about Anthropic MCP"

## Agent runs digest

```bash
notslop digest "Anthropic MCP" --since 24h --top 10 --for-content
```

## Digest output (abbreviated)

```
[1] r/ClaudeCode · "MCP server discovery is still manual in 2025"
    "Why do I have to hand-edit JSON configs to add an MCP server? 400+ upvotes"
    https://reddit.com/r/ClaudeCode/comments/1abc123

[2] news.ycombinator.com · "Anthropic MCP: six months in"
    "HN thread: top comment notes that MCP adoption grew 3x in Q1 but tooling
     fragmentation is the main complaint — every client implements auth differently"
    https://news.ycombinator.com/item?id=40012345

[3] x.com/@karpathy · "MCP is the right abstraction..."
    "...but the registry problem isn't solved. Every team reinvents discovery.
     Needs a pip/npm moment."
    https://x.com/karpathy/status/1780000001
```

## Agent picks 2 data points

- **Data point 1**: MCP adoption grew 3x in Q1 (HN thread)
- **Data point 2**: Karpathy's "needs a pip/npm moment" framing on registry/discovery

## Draft tweet (272 chars)

```
MCP adoption tripled in Q1. The tooling still hasn't caught up.

Every team writes their own discovery logic. Karpathy called it: it needs
a pip/npm moment — a shared registry, not 50 bespoke JSON configs.

The abstraction is right. The ecosystem isn't there yet.
```

**Char count: 272 / 280**

## Sources

1. HN: "Anthropic MCP: six months in" — https://news.ycombinator.com/item?id=40012345
2. @karpathy on X — https://x.com/karpathy/status/1780000001

---

## User asks for a contrarian variant

> "Give me a more contrarian take"

## Variant (contrarian tone, 261 chars)

```
MCP tripled adoption in Q1. Everyone is celebrating.

The registry problem is still unsolved. You're still hand-editing JSON.
Auth is different in every client.

Growth without tooling consolidation just means 3x the fragmentation.
```

**Char count: 261 / 280**
