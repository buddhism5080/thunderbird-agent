# OpenClaw

## Recommended setup

1. provide this repo as context so OpenClaw can read `AGENTS.md`
2. expose the local CLI path if OpenClaw runs outside the repo
3. prefer direct shell commands over custom wrappers

## Useful commands

```bash
node packages/cli/thunderbird-agent.cjs doctor
node packages/cli/thunderbird-agent.cjs tools list
node packages/cli/thunderbird-agent.cjs tools call getRecentMessages --args '{"daysBack":3,"maxResults":20}'
```

## Workflow tips

- start with read-only queries before mutating mail state
- use filter tools only after validating message patterns from search results
- keep review-first sending as the default
