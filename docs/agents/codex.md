# Codex

## Recommended setup

1. give Codex this repo as working context so it can read `AGENTS.md`
2. allow shell access to the Thunderbird Agent CLI
3. keep Thunderbird running locally while Codex calls tools

## First commands

```bash
node packages/cli/thunderbird-agent.cjs doctor
node packages/cli/thunderbird-agent.cjs tools list --catalog
```

## Notes

- use `tools list --catalog` when Thunderbird is not running yet
- use `tools call ... --args ...` for deterministic, auditable calls
- preserve `messageId` + `folderPath` pairs across follow-up actions
