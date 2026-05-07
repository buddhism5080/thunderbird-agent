# Agent integration notes

This directory contains **CLI-first** notes for using Thunderbird Agent from different AI coding assistants and agent runtimes.

Files:

- `claude-code.md` — Claude Code usage notes
- `codex.md` — Codex usage notes
- `openclaw.md` — OpenClaw usage notes

## Default recommendation

Give the agent this repo as working context and let it use:

```bash
node packages/cli/thunderbird-agent.cjs doctor
node packages/cli/thunderbird-agent.cjs tools list
node packages/cli/thunderbird-agent.cjs tools call searchMessages --args '{"query":"invoice","maxResults":10}'
```

If the CLI is installed globally, allow:

```bash
thunderbird-agent doctor
thunderbird-agent tools list
```

## Why CLI-first?

- avoids agent-runtime-specific protocol glue
- easier to audit and debug
- works for agents that can run shell commands but do not share a common tool protocol
- matches the repo-local instruction files (`AGENTS.md`, `CLAUDE.md`) and reusable skill (`skills/thunderbird-agent/SKILL.md`)
