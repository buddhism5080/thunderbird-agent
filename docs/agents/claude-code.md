# Claude Code

Claude Code works well with Thunderbird Agent because the repository already ships a Claude-specific companion file and a CLI-first workflow.

## Recommended setup

1. open this repository in Claude Code
2. let Claude Code read `CLAUDE.md` and `AGENTS.md`
3. allow terminal access
4. keep Thunderbird running locally

## First commands

```bash
node packages/cli/thunderbird-agent.cjs doctor
node packages/cli/thunderbird-agent.cjs tools list
node packages/cli/thunderbird-agent.cjs tools call getRecentMessages --args '{"daysBack":3,"maxResults":10}'
```

## Good task shapes

- inbox triage
- reply drafting with review-first send
- filter creation after examining real messages
- contact or calendar lookup tied to message context

## Guardrails

- keep `skipReview` false by default
- preserve `messageId` and `folderPath` for follow-up actions
- verify mailbox state after bulk updates when the result matters
