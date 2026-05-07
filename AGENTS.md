# Thunderbird Agent Guide

Use this repository when an AI agent needs **safe, scriptable access to Thunderbird through the local CLI**.

## Project stance

This repo is intentionally:

- **CLI-first**
- **localhost-only**
- **review-first for send flows**
- **vendor-neutral across agent runtimes**

Do **not** reintroduce protocol adapters or framework-specific packaging unless the user explicitly asks for them.

## Default workflow in this repo

1. keep Thunderbird running locally
2. use the CLI instead of bypassing it with custom HTTP calls
3. prefer read-only inspection before mutating mailbox state
4. keep `skipReview: false` unless the user explicitly approved direct send
5. after changing tool metadata, rebuild the exported catalog

## Canonical commands

```bash
# Quality gates
npm test
npm run build
npm run pack:check

# CLI
node packages/cli/thunderbird-agent.cjs doctor
node packages/cli/thunderbird-agent.cjs tools list
node packages/cli/thunderbird-agent.cjs tools list --catalog
node packages/cli/thunderbird-agent.cjs tools call searchMessages --args '{"query":"invoice","maxResults":10}'
```

## When editing this repo

### If you change tool definitions

Files usually involved:

- `extension/agent_server/api.js`
- `shared/tool-catalog.json`
- `test/tool-catalog.test.cjs`
- `README.md` / `skills/thunderbird-agent/SKILL.md` if user-facing behavior changed

Run:

```bash
npm run build:catalog
npm test
```

### If you change build or packaging

Files usually involved:

- `package.json`
- `scripts/build-xpi.cjs`
- `scripts/build.sh`
- `scripts/install.sh`
- `extension/manifest.json`

Run:

```bash
npm run check:versions
npm run build
npm run pack:check
```

### If you change docs or skill surfaces

Keep these aligned when behavior changes:

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/agents/*.md`
- `skills/thunderbird-agent/SKILL.md`

## Safety rules for mailbox mutations

- preserve both `messageId` and `folderPath` across follow-up calls
- validate search results before bulk mutation
- verify IMAP state after folder/message changes when results matter
- do not widen account access or tool access in code unless the user explicitly asked

## Environment overrides

- `THUNDERBIRD_AGENT_CONNECTION_FILE`
- `THUNDERBIRD_AGENT_CLI`
