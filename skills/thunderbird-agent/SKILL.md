---
name: thunderbird-agent
description: Use when an AI agent needs to read mail, search messages, draft replies, manage folders or filters, or inspect Thunderbird contacts, calendars, and tasks through the local Thunderbird Agent CLI.
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

Thunderbird Agent exposes a local Thunderbird profile as a **CLI-first automation surface** for AI agents.

It is the right tool when the mailbox already lives in Thunderbird and the user wants an agent to help with triage, drafting, cleanup, filters, contacts, calendars, or tasks **without moving the workflow into a browser or SaaS API**.

## When to Use

Use this skill when you need to:

- search or summarize mail from Thunderbird
- draft replies or forwards with Thunderbird-native review
- clean up tags, folders, junk, or trash
- create, update, reorder, or run filters
- inspect contacts, events, or tasks from the same local profile
- debug whether the Thunderbird Agent CLI can currently reach Thunderbird

Do not use this skill when:

- the user wants remote/cloud mailbox automation outside Thunderbird
- Thunderbird is not the system-of-record mailbox client
- the task requires widening account/tool permissions without user approval

## First-run checklist

```bash
npm run build
node packages/cli/thunderbird-agent.cjs doctor
node packages/cli/thunderbird-agent.cjs tools list
```

Expected outcome:

- build produces `dist/thunderbird-agent.xpi`
- `doctor` reports live connectivity
- `tools list` returns the live tool surface

## Core Commands

### Health and discovery

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
node packages/cli/thunderbird-agent.cjs tools call applyFilters --args '{"accountId":"...","folderPath":"Inbox"}'
```

If the CLI is globally installed:

```bash
thunderbird-agent doctor
thunderbird-agent tools list
```

## Recommended workflows

### Read and summarize mail

1. run `searchMessages`
2. inspect candidates with `getMessage`
3. summarize and suggest actions

### Reply safely

1. locate the target message
2. call `replyToMessage` with `skipReview: false`
3. let the user review in Thunderbird before sending

### Bulk cleanup

1. estimate scope with `searchMessages` + `countOnly`
2. fetch exact targets if needed
3. apply `updateMessage`, `deleteMessages`, `applyFilters`, `emptyTrash`, or `emptyJunk`

### Filter authoring

1. inspect real message patterns with `searchMessages`
2. create the rule with `createFilter`
3. verify order with `listFilters`
4. optionally run the rule with `applyFilters`

## Repository surfaces

- `README.md` — product, setup, build, packaging, troubleshooting
- `AGENTS.md` — repo-level instructions for broad agent runtimes
- `CLAUDE.md` — Claude Code specific notes
- `docs/agents/README.md` — agent integration overview
- `docs/agents/claude-code.md` / `codex.md` / `openclaw.md` — runtime-specific notes

## Environment overrides

- `THUNDERBIRD_AGENT_CONNECTION_FILE` — force an explicit connection file path
- `THUNDERBIRD_AGENT_CLI` — force an explicit CLI path when a wrapper or external workspace needs it

## Common pitfalls

1. **Sending mail too early**  
   Keep `skipReview` false unless the user explicitly approved direct send.

2. **Dropping `folderPath`**  
   Many follow-up tools require both `messageId` and `folderPath`.

3. **Assuming immediate IMAP consistency**  
   Folder counts and search results can lag after mutations; verify with `listFolders` or a fresh query.

4. **Creating filters before looking at real messages**  
   Always inspect actual examples first so rules are based on real senders/subjects/tags.

5. **Ignoring connection overrides**  
   If discovery fails, set `THUNDERBIRD_AGENT_CONNECTION_FILE` explicitly.

## Verification Checklist

- [ ] Thunderbird is running
- [ ] `npm run build` or the required artifact already exists
- [ ] `doctor` succeeds
- [ ] the intended tool is visible in `tools list`
- [ ] `skipReview` is false unless the user explicitly wanted direct send
- [ ] post-mutation state was verified for important mail/folder operations
