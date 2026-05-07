# Codex

Codex is a good fit when you want deterministic shell-based workflows against Thunderbird Agent.

## Recommended setup

1. give Codex this repository as context so it can read `AGENTS.md`
2. allow shell access to the local CLI
3. keep Thunderbird open while Codex calls live tools

## First commands

```bash
node packages/cli/thunderbird-agent.cjs doctor
node packages/cli/thunderbird-agent.cjs tools list --catalog
node packages/cli/thunderbird-agent.cjs tools call searchMessages --args '{"query":"from:alice subject:report","maxResults":5}'
```

## Notes

- use `tools list --catalog` before Thunderbird is running
- use `tools call ... --args ...` when you want auditable single-step calls
- keep `messageId` + `folderPath` pairs intact between search and mutation steps
