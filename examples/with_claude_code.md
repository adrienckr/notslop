# Using social-context with Claude Code

social-context ships a set of Claude Code skills under `skills/`. Once
installed, Claude Code routes natural-language prompts like
"what's everyone saying about X" through the right command and returns a
reranked, ready-to-summarize digest.

## Install

1. Make sure the CLI is on your PATH (or use `npx social-context`):

   ```bash
   npm install -g social-context
   ```

2. Copy the skill bundles into your Claude Code skills directory:

   ```bash
   cp -r skills/* ~/.claude/skills/
   ```

   The four skills are `digest`, `trending`, `pulse`, and `voices`. Each is a
   self-contained folder with a `SKILL.md`.

3. Set your ZeroEntropy key so the skills can rerank. Either export it in your
   shell, or add it to your Claude Code env:

   ```bash
   export ZEROENTROPY_API_KEY="ze_..."
   ```

   Get a free key at
   [dashboard.zeroentropy.dev](https://dashboard.zeroentropy.dev/?utm_source=social-context-cli&utm_medium=docs&utm_campaign=v0.1).

4. Run `social-context init` once to write `~/.social-context/config.json` with
   your X handles, blogs, and subreddits.

## Prompts that trigger each skill

- digest — "what's everyone saying about local LLMs today"
- trending — "what's hot in AI agents right now"
- pulse — "track mentions of LangChain over the last week"
- voices — "who are the loudest voices on RAG this week"

## Worked example

You ask Claude Code:

> What's the conversation around long-context models today? Give me five
> things worth reading.

Claude Code invokes the `digest` skill, which runs:

```bash
social-context digest "long-context models" --since 24h --top 5 --format json
```

Behind the scenes:

1. Reddit, HN, blogs, and X each return their candidates.
2. ZeroEntropy reranks every candidate against the query string.
3. The top five are returned as structured JSON.

Claude Code reads the JSON, picks the three or four most useful ones, writes a
short summary with links, and surfaces author handles so you can follow up.
The rerank cuts the noise that pure recency or score sorting would leave in.
