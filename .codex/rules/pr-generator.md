---
description: "PR summary from git diff (plain text, Bitbucket/SourceTree). On attach: run immediately — staged vs HEAD unless user message includes -all."
alwaysApply: false
---

# PR summary generator

## On attach (required)

**As soon as this rule is included in context**, **run immediately in this turn**. Do not wait for the user to say "write PR" or "PR summary".

**Follow:** [`.cursor/skills/pr-generator-rule/SKILL.md`](../skills/pr-generator-rule/SKILL.md) (PR summary only). Uses the **host repo** where this skill lives — see skill.

**Shell git commands:** use `rtk git status`, `rtk git diff`, etc. — see [rtk-shell.mdc](rtk-shell.mdc).

**PR output format:** [`.cursor/skills/prepare-release/pr-format.md`](../skills/prepare-release/pr-format.md)

**Do not** run on unrelated turns unless this rule is attached again or the user explicitly asks for a PR summary.

## Quick reference

| User includes | Diff scope |
|---------------|------------|
| `-all` | Working directory vs `HEAD` |
| `-stage` or (none) | Staged vs `HEAD` |

For PR **and** changelog in one turn, use `@prepare-release` instead.
