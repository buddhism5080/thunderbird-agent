---
name: thunderbird-agent
description: Use when an AI agent needs to search mail, read messages, draft replies, manage folders and filters, or inspect calendars and contacts through Thunderbird Agent's local CLI.
version: 1.0.0
author: Thunderbird Agent
license: MIT
metadata:
  hermes:
    tags: [thunderbird, email, mailbox, calendar, contacts, filters, cli, agentskills]
    related_skills: []
---

# Thunderbird Agent

## Overview

Thunderbird Agent exposes Thunderbird as a **local CLI-first automation surface** for AI agents.

The preferred interface is the `thunderbird-agent` CLI because it works across agents that can read repo instructions and run shell commands, without depending on a runtime-specific tool protocol.

## When to Use

Use this skill when you need to:
- search or read mail from Thunderbird
- draft replies or forwards safely
- organize folders, tags, filters, junk, or trash
- inspect or update contacts, events, and tasks
- debug Thunderbird connectivity from an AI-agent workflow

Do not use this skill when:
- the user wants remote or cloud mailbox access outside Thunderbird
- Thunderbird is not the system-of-record mailbox client

## Core Commands

### Health / discovery

```bash
node packages/cli/thunderbird-agent.cjs doctor
```

### Live tools

```bash
node packages/cli/thunderbird-agent.cjs tools list
```

### Offline catalog

```bash
node packages/cli/thunderbird-agent.cjs tools list --catalog
```

### Direct tool calls

```bash
node packages/cli/thunderbird-agent.cjs tools call searchMessages --args '{"query":"invoice from:alice","maxResults":5}'
node packages/cli/thunderbird-agent.cjs tools call getMessage --args '{"messageId":"...","folderPath":"..."}'
node packages/cli/thunderbird-agent.cjs tools call replyToMessage --args '{"messageId":"...","folderPath":"...","body":"Draft reply here","skipReview":false}'
```

If the CLI is globally installed:

```bash
thunderbird-agent doctor
thunderbird-agent tools list
```

## Typical Workflows

### Read and summarize mail
1. run `searchMessages`
2. inspect one or more candidates with `getMessage`
3. summarize and propose actions

### Reply safely
1. locate the target message
2. call `replyToMessage` with `skipReview: false`
3. let the user review in Thunderbird before sending

### Bulk cleanup
1. estimate scope with `countOnly`
2. fetch exact targets if needed
3. use `updateMessage`, `deleteMessages`, `applyFilters`, `emptyTrash`, or `emptyJunk`

## Repo Surfaces

- `AGENTS.md` — broad cross-agent instructions
- `CLAUDE.md` — Claude Code specific notes
- `docs/agents/claude-code.md` — Claude Code CLI-first usage
- `docs/agents/codex.md` — Codex CLI-first usage
- `docs/agents/openclaw.md` — OpenClaw CLI-first usage

## Common Pitfalls

1. **Sending mail too early**  
   Keep `skipReview` false unless the user explicitly approved direct sending.

2. **Dropping `folderPath`**  
   Many follow-up tools need both `messageId` and `folderPath`.

3. **Assuming immediate IMAP consistency**  
   Folder counts and search results can lag after mutations; verify with `listFolders` or a fresh query.

4. **Ignoring connection overrides**  
   If discovery fails, set `THUNDERBIRD_AGENT_CONNECTION_FILE` explicitly.

## Verification Checklist

- [ ] Thunderbird is running
- [ ] `doctor` succeeds
- [ ] the intended tool is visible in `tools list`
- [ ] `skipReview` is false unless the user explicitly wanted direct send
- [ ] post-mutation state was verified for mail/folder operations
