# Using notslop with Cursor

Cursor doesn't load Claude Code-style `SKILL.md` bundles, but the CLI works
inside Cursor's terminal and Composer the same way it does anywhere else.

## Install

```bash
npm install -g notslop
notslop init
```

Set your ZeroEntropy key (get a free one at
[dashboard.zeroentropy.dev](https://dashboard.zeroentropy.dev/?utm_source=notslop-cli&utm_medium=docs&utm_campaign=v0.2)):

```bash
export ZEROENTROPY_API_KEY="ze_..."
```

## Workflow inside Cursor

In Composer or the chat panel, ask the agent to run a command:

> Run `notslop digest "Anthropic news" --since 24h --top 5 --format md`
> and summarize the top three.

The agent executes the CLI via Bash, parses the markdown table, and folds the
findings back into your editor session. Pipe to `--format json` if you want
the agent to manipulate the structured payload directly.

## MCP server mode (planned)

A dedicated MCP server that exposes `digest`, `trending`, `pulse`, and
`voices` as tools is planned for v0.3. That will let Cursor (and any other
MCP-aware host) call notslop without shelling out. Track progress on
the project README.

## Tip

Pin the CLI version in your shell init so the agent gets reproducible output:

```bash
alias nsl='npx notslop@0.2'
```
