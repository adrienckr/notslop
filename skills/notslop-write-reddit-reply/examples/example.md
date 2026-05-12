# Example: Reply to Reddit thread about MCP discovery

## User

> "Reply to this thread: https://reddit.com/r/ClaudeCode/comments/1abc123"

## Agent fetches thread JSON

```bash
curl -s -A "notslop/0.3" "https://reddit.com/r/ClaudeCode/comments/1abc123.json" | head -c 50000
```

## Parsed thread (abbreviated)

**Post title:** "MCP server discovery is still manual in 2025"

**Post body:** "Why do I have to hand-edit a JSON config to add an MCP server?
I've been at this for two hours. There must be a better way."

**Top comments:**
- u/dev_alice (412 pts): "There's a community GitHub catalog with ~2k servers listed.
  Not official, but it's the closest thing to a registry. github.com/example/mcp-servers"
- u/eng_bob (289 pts): "The auth inconsistency between clients is the deeper problem.
  Even when you find a server, it may not work across Claude Desktop + Cursor."
- u/ml_carol (201 pts): "Filed this as feedback to Anthropic. The answer was basically
  'working on it.' Hasn't shipped yet."

## Agent identifies reply target

User didn't specify — agent picks the most substantive comment to add value to:
**u/eng_bob's comment** about auth inconsistency (most actionable gap to address).

## Agent pulls adjacent context

```bash
notslop digest "MCP auth client compatibility" --sources reddit --since 30d --top 10 --for-content
```

Finds: r/cursor thread documenting exact auth delta between Claude Desktop and Cursor,
with a working workaround. URL: https://reddit.com/r/cursor/comments/1def456

## Reply draft

Replying to: u/eng_bob — https://reddit.com/r/ClaudeCode/comments/1abc123/comment/xyz

---

The auth delta is real and documented. Someone in r/cursor mapped the exact difference
between Claude Desktop and Cursor auth flows last month and posted a workaround —
it's not elegant but it works if you need both clients running the same server.

---

**Char count: ~280**

**Note:** Cites one adjacent thread, no self-promotion, matches r/ClaudeCode's
technical-casual tone, opens directly on the substance without filler.
