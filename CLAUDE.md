# Claude Code notes for Thunderbird Agent

Use the local CLI first:

```bash
node packages/cli/thunderbird-agent.cjs doctor
node packages/cli/thunderbird-agent.cjs tools list
node packages/cli/thunderbird-agent.cjs tools call searchMessages --args '{"query":"invoice","maxResults":10}'
```

For broad project conventions and safety rules, also read `AGENTS.md`.

## Mail safety

- keep `skipReview` false unless the user explicitly approved direct send
- for message operations, preserve both `messageId` and `folderPath`
- after IMAP folder changes, verify with `listFolders`

## Skill

This repo ships a vendor-neutral skill at:

`skills/thunderbird-agent/SKILL.md`

Load or reference that skill when you want reusable Thunderbird workflows rather than only one-off commands.
