# Thunderbird Agent Guide

Use this repo when an AI agent needs **safe, scriptable access to Thunderbird** through the local CLI.

## Preferred operating mode

Prefer the CLI over direct HTTP whenever possible.

Why:
- it already handles connection-file discovery
- it reuses the same auth + retry logic as the extension transport
- it is easy to script from terminal-capable agents
- it works across Claude Code, Codex, OpenClaw, Hermes, and other repo-aware agent runtimes

## Important commands

```bash
# Health / discovery
node packages/cli/thunderbird-agent.cjs doctor

# Inspect live tools from a running Thunderbird session
node packages/cli/thunderbird-agent.cjs tools list

# Inspect the offline shared catalog without Thunderbird running
node packages/cli/thunderbird-agent.cjs tools list --catalog

# Call a tool directly
node packages/cli/thunderbird-agent.cjs tools call searchMessages --args '{"query":"invoice","maxResults":10}'
```

If the CLI was installed globally, the same commands become:

```bash
thunderbird-agent doctor
thunderbird-agent tools list
```

## Safety rules

- Default to review-first mail flows.
- Do **not** set `skipReview: true` unless the user explicitly wants direct sending.
- For message actions, preserve both `messageId` and `folderPath` from search results.
- After IMAP folder mutations, verify with `listFolders` because changes can be asynchronous.

## Recommended workflows

### Read mail
1. `searchMessages`
2. `getMessage`
3. summarize / propose next action

### Reply / forward
1. locate target message with `searchMessages` or `getRecentMessages`
2. call `replyToMessage` or `forwardMessage`
3. keep `skipReview` false by default

### Bulk organization
1. estimate with `searchMessages` + `countOnly`
2. fetch exact items if needed
3. apply `updateMessage`, `createFilter`, `updateFilter`, `applyFilters`, or folder tools

## Instruction / skill surfaces in this repo

- `AGENTS.md` — broad agent-facing project instructions
- `CLAUDE.md` — Claude Code specific companion instructions
- `skills/thunderbird-agent/SKILL.md` — vendor-neutral Thunderbird workflow skill
- `docs/agents/` — CLI-first notes for Claude Code, Codex, and OpenClaw

## Environment overrides

- `THUNDERBIRD_AGENT_CONNECTION_FILE` — force an explicit connection file path
- `THUNDERBIRD_AGENT_CLI` — force an explicit CLI path for wrapper scripts or external agent workspaces
