# OpenClaw

OpenClaw can use Thunderbird Agent effectively through the repository instructions plus the local CLI.

## Recommended setup

1. provide this repository as context so OpenClaw can read `AGENTS.md`
2. expose the local CLI path if OpenClaw runs outside the repo root
3. prefer direct shell commands over custom wrappers

## Useful commands

```bash
node packages/cli/thunderbird-agent.cjs doctor
node packages/cli/thunderbird-agent.cjs tools list
node packages/cli/thunderbird-agent.cjs tools call getRecentMessages --args '{"daysBack":3,"maxResults":20}'
```

## Workflow guidance

- start with read-only inspection before mutating mail state
- validate message patterns before creating broad filters
- keep review-first compose behavior as the default
