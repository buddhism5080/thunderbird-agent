# Thunderbird Agent

[![Tools](https://img.shields.io/badge/36_Tools-email%2C_compose%2C_filters%2C_calendar%2C_contacts-blue.svg)](#tool-surface)
[![Privacy](https://img.shields.io/badge/Privacy-localhost_only-green.svg)](#security-model)
[![Thunderbird](https://img.shields.io/badge/Thunderbird-102%2B-0a84ff.svg)](https://www.thunderbird.net/)
[![License: MIT](https://img.shields.io/badge/License-MIT-grey.svg)](LICENSE)

Thunderbird Agent turns a local Thunderbird profile into a **CLI-first automation surface for AI agents**.

It lets Claude Code, Codex, OpenClaw, Hermes, and any other shell-capable agent safely work with:

- mail search and message retrieval
- draft / reply / forward workflows
- folder cleanup and tagging
- filter CRUD and manual application
- contacts, calendars, and tasks

The architecture is intentionally simple:

1. **Thunderbird extension** — the execution engine and permission boundary
2. **shared transport core** — connection discovery, auth, retry, JSON-RPC over localhost
3. **local CLI** — the primary agent-facing interface
4. **repo-local instructions + skill** — reusable guidance across agent runtimes

<p align="center">
  <img src="https://raw.githubusercontent.com/buddhism5080/thunderbird-agent/main/docs/demo.gif" alt="Thunderbird Agent demo" width="720">
</p>

> Inspired by [bb1/thunderbird-mcp](https://github.com/bb1/thunderbird-mcp), but intentionally rebuilt as a protocol-light, CLI-first agent package.

---

## Why this project exists

Thunderbird is a rich local mail client, but most AI tooling still assumes either browser automation or remote SaaS APIs.
Thunderbird Agent closes that gap with a **localhost-only** integration layer that keeps mail inside Thunderbird while giving AI agents high-level tools to read, draft, organize, and inspect.

The default posture is conservative:

- compose flows open review UI before send
- account/tool access is user-configurable in the extension
- auth tokens are session-scoped and stored in a local connection file
- there is no remote listener and no cloud relay

---

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/buddhism5080/thunderbird-agent.git
cd thunderbird-agent
```

### 2. Build the extension artifact

```bash
npm run build
```

This produces:

- `dist/thunderbird-agent.xpi`
- a refreshed `shared/tool-catalog.json`

### 3. Install the extension in Thunderbird

In Thunderbird:

- **Tools → Add-ons and Themes**
- click the gear menu
- **Install Add-on From File...**
- choose `dist/thunderbird-agent.xpi`
- restart Thunderbird

Or from the repository root on a local workstation:

```bash
./scripts/install.sh
```

### 4. Verify the CLI can see Thunderbird

```bash
node packages/cli/thunderbird-agent.cjs doctor
```

### 5. Call tools directly

```bash
node packages/cli/thunderbird-agent.cjs tools list
node packages/cli/thunderbird-agent.cjs tools call searchMessages --args '{"query":"invoice","maxResults":10}'
```

If installed globally:

```bash
thunderbird-agent doctor
thunderbird-agent tools list
```

---

## Tool surface

Thunderbird Agent currently exports **36 tools** across six categories.

### Mail

- `listAccounts`
- `listFolders`
- `searchMessages`
- `getMessage`
- `getRecentMessages`
- `displayMessage`
- `updateMessage`
- `deleteMessages`
- `createFolder`
- `renameFolder`
- `moveFolder`
- `deleteFolder`
- `emptyTrash`
- `emptyJunk`

### Compose

- `sendMail`
- `replyToMessage`
- `forwardMessage`

### Filters

- `listFilters`
- `createFilter`
- `updateFilter`
- `deleteFilter`
- `reorderFilters`
- `applyFilters`

### Contacts

- `searchContacts`
- `createContact`
- `updateContact`
- `deleteContact`

### Calendar and tasks

- `listCalendars`
- `createEvent`
- `listEvents`
- `updateEvent`
- `deleteEvent`
- `createTask`
- `listTasks`
- `updateTask`

### Access control visibility

- `getAccountAccess`

For the authoritative machine-readable catalog, use:

```bash
node packages/cli/thunderbird-agent.cjs tools list --catalog
```

---

## CLI reference

```bash
thunderbird-agent doctor
thunderbird-agent tools list
thunderbird-agent tools list --catalog
thunderbird-agent tools call searchMessages --args '{"query":"from:alice report","maxResults":5}'
thunderbird-agent rpc --request '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Commands:

- `doctor` — validate connection discovery and live access
- `tools list` — enumerate live tools from a running Thunderbird session
- `tools list --catalog` — inspect the offline exported catalog
- `tools call <name> --args <json>` — invoke one tool and print JSON output
- `catalog [show <name>]` — inspect the shared tool catalog
- `rpc --request <json>` — send raw JSON-RPC to the localhost transport for debugging

---

## Agent integration surfaces

This repository intentionally optimizes for **repo-aware, terminal-capable agents**, not for a shared runtime protocol.

Primary surfaces:

- `AGENTS.md` — repo-level instructions for broad agent runtimes
- `CLAUDE.md` — Claude Code specific companion guidance
- `skills/thunderbird-agent/SKILL.md` — reusable Thunderbird workflow skill
- `docs/agents/` — concise integration notes for Claude Code, Codex, and OpenClaw

Start here:

- `docs/README.md`
- `docs/agents/README.md`

---

## Build and packaging

### Canonical build commands

```bash
npm run check:versions
npm run build:catalog
npm run build:xpi
npm run build
npm run pack:check
```

What they do:

- `check:versions` — enforce that `package.json` and `extension/manifest.json` use the same release version
- `build:catalog` — re-export `shared/tool-catalog.json`
- `build:xpi` — produce `dist/thunderbird-agent.xpi` **without mutating the source tree**
- `build` — run the full local release pipeline
- `pack:check` — preview npm package contents and size

The npm package intentionally ships the CLI, extension source, exported tool catalog, skill/docs surfaces, and the built XPI artifact — but excludes large repo-only assets like the local demo GIF from the tarball.

---

## Connection discovery

The shared transport re-discovers `connection.json` on cache misses. Search order:

1. `THUNDERBIRD_AGENT_CONNECTION_FILE`
2. native temp dir: `<os.tmpdir()>/thunderbird-agent/connection.json`
3. macOS temp fallback under `/var/folders/*/*/T/thunderbird-agent/connection.json`
4. Thunderbird Snap `TMPDIR` plus the official snap fallback path
5. Flatpak / Betterbird runtime paths under `$XDG_RUNTIME_DIR/app/*/thunderbird-agent/connection.json`

Useful overrides:

```bash
export THUNDERBIRD_AGENT_CONNECTION_FILE=/absolute/path/to/connection.json
export THUNDERBIRD_AGENT_CLI=/absolute/path/to/thunderbird-agent/packages/cli/thunderbird-agent.cjs
```

---

## Security model

- **localhost only** — no remote listener
- **session-scoped bearer token** — written to a local connection file with restrictive permissions
- **review-first compose flows** — mail can open in Thunderbird before send
- **user-controlled account access** — mailbox visibility is configurable in extension settings
- **user-controlled tool access** — individual tools can be disabled in extension settings

If you are using an AI agent to send or modify mail, keep `skipReview: false` unless the user explicitly asked for silent send behavior.

---

## Troubleshooting

| Problem | What to check |
|---|---|
| `doctor` says connection file not found | Thunderbird is running; extension is enabled; connection override path is correct |
| CLI can list catalog but not live tools | Thunderbird is not running yet, or the extension failed to start |
| Compose actions fail with `skipReview` | The user may have enabled the extension-side safety block |
| IMAP state looks stale | Open the folder in Thunderbird or repair/sync it before retrying |
| Build output missing | Run `npm run build` and confirm `dist/thunderbird-agent.xpi` exists |

---

## Documentation map

- `docs/README.md` — documentation overview
- `docs/agents/README.md` — agent integration overview
- `docs/agents/claude-code.md` — Claude Code workflow notes
- `docs/agents/codex.md` — Codex workflow notes
- `docs/agents/openclaw.md` — OpenClaw workflow notes
- `docs/filter-api-research.md` — archived filter implementation notes

---

## Development checklist

```bash
npm test
npm run build
npm run pack:check
```

If you change tool metadata in `extension/agent_server/api.js`, always refresh `shared/tool-catalog.json` before committing.

---

## Repository layout

```text
thunderbird-agent/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── dist/
│   └── thunderbird-agent.xpi
├── docs/
│   ├── README.md
│   ├── agents/
│   └── filter-api-research.md
├── extension/
│   ├── agent_server/
│   ├── manifest.json
│   └── options.*
├── packages/
│   ├── cli/
│   └── core/
├── scripts/
├── shared/
├── skills/
│   └── thunderbird-agent/
└── test/
```
