---
name: notslop-find-related
description: Use when the user wants to find recent posts semantically similar to a piece of content (URL or text). Embeds the input + ranks candidates across Reddit / HN / blogs / X by cosine similarity. Use for repurpose workflows or "what else is being said about this" research.
---

## Providers required

| Capability | Required | Providers (BYOK) | Setup | Cost |
|---|---|---|---|---|
| Pull social signal (Reddit/HN/blogs) | yes | built-in, no key needed | — | free |
| Embed for cosine similarity | yes | ZeroEntropy `zembed-1` | [PROVIDERS.md#zeroentropy-rerank--embed](../../PROVIDERS.md#zeroentropy-rerank--embed) | free tier OK |
| Scrape X posts | **only if topic needs X data** | Orthogonal (ScrapeCreators) | [PROVIDERS.md#x-twitter--via-orthogonal](../../PROVIDERS.md#x-twitter--via-orthogonal) | ~$0.02/handle, $10 free at signup |

# When to use this skill

- "Find related discussions to <url>"
- "What are people saying that's similar to <thread or post>?"
- "Search for posts close to this draft: <text>"
- Pre-step for repurpose: find related signal before adapting a post

If the user wants a topical digest (not similarity to a specific input), use `notslop-digest` instead.

# Setup

The user must have run `notslop init` and configured a ZeroEntropy API key. ZE embeddings (zembed-1) are required — these are billed per call but cached locally so repeat queries on the same input are free.

# Steps

1. Determine the input. It can be:
   - A URL (http:// or https://) — notslop will fetch and strip HTML
   - Pasted text — passed through directly

2. Run via Bash:

   ```bash
   notslop find-related "<INPUT>" --since 7d --top 10 --format json
   ```

3. Parse the JSON `related` array. Each entry has:
   - `rank` — 1-based position
   - `similarity` — cosine score 0-1
   - `post.source` (reddit / hn / blogs / x)
   - `post.title`
   - `post.url`
   - `post.author`

4. Present the top results to the user. Highlight which sources cluster around the input (e.g. "3 of the top 5 are r/ClaudeCode threads — that's where this is being discussed most").

5. If the user wants to dive deeper into a result, suggest follow-up commands (`notslop digest "<related-topic>"`, etc.).
