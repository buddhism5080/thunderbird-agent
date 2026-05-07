# Claude Code notes for Thunderbird Agent

Read `AGENTS.md` first, then use the local CLI.

## First commands

```bash
node packages/cli/thunderbird-agent.cjs doctor
node packages/cli/thunderbird-agent.cjs tools list
```

## If you modify the repo

```bash
npm test
npm run build
npm run pack:check
```

## Mail safety

- keep `skipReview` false unless the user explicitly approved direct sending
- preserve `messageId` + `folderPath` pairs between read and write steps
- verify folder state after IMAP mutations when correctness matters

## Skill surface

Reusable Thunderbird workflow guidance lives at:

- `skills/thunderbird-agent/SKILL.md`
