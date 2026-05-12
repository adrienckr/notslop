# Example: Post on r/ClaudeCode about MCP server discovery

## User

> "Write a post on r/ClaudeCode about MCP server discovery"

## Agent runs digest

```bash
notslop digest "MCP server discovery" --sources reddit --since 7d --top 15 --for-content
```

## Digest output (abbreviated)

```
[1] r/ClaudeCode · "MCP server discovery is still manual in 2025"
    "Thread: 400+ upvotes. Top comment describes editing JSON configs by hand
     to register servers. Several users asking for a GUI or a shared catalog."
    https://reddit.com/r/ClaudeCode/comments/1abc123

[2] r/ClaudeCode · "Is there a list of working MCP servers somewhere?"
    "Thread asking for community catalog. Top answer links a GitHub repo
     with 2k stars maintained by one person."
    https://reddit.com/r/ClaudeCode/comments/1ghi789

[3] r/cursor · "MCP server works in Claude Desktop but not in Cursor"
    "Auth delta — Claude Desktop uses one flow, Cursor another. Documented workaround."
    https://reddit.com/r/cursor/comments/1def456
```

## Agent reads the room

r/ClaudeCode culture: technical, experience-sharing, low tolerance for vendor hype,
appreciates concrete problem descriptions over feature requests. Casual-technical tone.

## Post draft

**Title:**
Anyone else finding MCP server setup entirely manual? How are you tracking what's installed?

**Body:**
Been wiring up a few MCP servers this week. Every one required hand-editing a JSON config,
and there's no easy way to see what's already registered without digging through files.

Saw a thread here last week (the 400-upvote one about manual discovery) that described
exactly the same friction. The community GitHub catalog helps, but it's one person maintaining it.

Curious how others are managing this at any scale. Are you scripting the setup, or just
living with the manual config process?

**Char count: ~420**

---

## Alternate titles

1. "MCP server management: is anyone scripting the setup, or is it still JSON files all the way down?"
2. "How do you keep track of which MCP servers you have installed?"
