# Using social-context with Cursor

Cursor doesn't load Claude Code-style `SKILL.md` bundles, but the CLI works
inside Cursor's terminal and Composer the same way it does anywhere else.

## Install

```bash
npm install -g social-context
social-context init
```

Set your ZeroEntropy key (get a free one at
[dashboard.zeroentropy.dev](https://dashboard.zeroentropy.dev/?utm_source=social-context-cli&utm_medium=docs&utm_campaign=v0.1)):

```bash
export ZEROENTROPY_API_KEY="ze_..."
```

## Workflow inside Cursor

In Composer or the chat panel, ask the agent to run a command:

> Run `social-context digest "Anthropic news" --since 24h --top 5 --format md`
> and summarize the top three.

The agent executes the CLI via Bash, parses the markdown table, and folds the
findings back into your editor session. Pipe to `--format json` if you want
the agent to manipulate the structured payload directly.

## MCP server mode (planned)

A dedicated MCP server that exposes `digest`, `trending`, `pulse`, and
`voices` as tools is planned for v0.2. That will let Cursor (and any other
MCP-aware host) call social-context without shelling out. Track progress on
the project README.

## Tip

Pin the CLI version in your shell init so the agent gets reproducible output:

```bash
alias scx='npx social-context@0.1'
```
