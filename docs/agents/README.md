# Agent integration guide

Thunderbird Agent is designed for **repo-aware, shell-capable agents**.

The expected integration pattern is:

1. give the agent this repository as context
2. let it read `AGENTS.md` (and `CLAUDE.md` for Claude Code)
3. let it run the local CLI
4. keep Thunderbird running on the same machine

## Common first-run checklist

```bash
npm run build
node packages/cli/thunderbird-agent.cjs doctor
node packages/cli/thunderbird-agent.cjs tools list
```

If the CLI is installed globally:

```bash
thunderbird-agent doctor
thunderbird-agent tools list
```

## Why the CLI is the primary surface

- fewer moving parts than protocol adapters
- easier to inspect and debug in logs
- works across Claude Code, Codex, OpenClaw, Hermes, and custom agent runners
- keeps one shared execution path for tests, docs, and real agent usage

## Files in this directory

- `claude-code.md` — Claude Code workflow notes
- `codex.md` — Codex workflow notes
- `openclaw.md` — OpenClaw workflow notes
