---
description: "Update CHANGELOG.md (Keep a Changelog). On attach: run immediately — draft or update entry from git diff unless user says preview-only."
alwaysApply: false
---

# Changelog writer

## On attach (required)

**As soon as this rule is included in context**, **run immediately in this turn**. Do not wait for the user to say "write changelog" or "update CHANGELOG".

**Follow:** [`.codex/skills/write-changelog/SKILL.md`](../skills/write-changelog/SKILL.md) (changelog only). Uses the **host repo** where this skill lives — see skill. **Skips** if `CHANGELOG.md` is absent (no create, no prompt).

**Shell git commands:** use `rtk git status`, `rtk git diff`, etc. — see [rtk-shell.mdc](rtk-shell.mdc).

**Changelog format:** [`.codex/skills/prepare-release/changelog-format.md`](../skills/prepare-release/changelog-format.md)

**Do not** run on unrelated turns unless this rule is attached again or the user explicitly asks for changelog work.

## Quick reference

| User includes | Behavior |
|---------------|----------|
| `-all` | Staged + unstaged diff vs `HEAD` |
| `preview only` / `no commit` | Show proposed markdown only; do not write file |

For PR **and** changelog in one turn, use `@prepare-release` instead.
