---
description: Mandatory RTK prefix for supported shell commands. Overrides bare git/gh/npm examples in commit, PR, build, and lint workflows.
alwaysApply: true
---

# RTK shell commands (mandatory)

Applies in **every** agent session when this repo is in the workspace (including multi-root). Full command list: [`AGENTS.md`](../../AGENTS.md).

## Requirement

**MUST** prefix Shell tool commands with `rtk` when RTK supports the underlying command. Zero behavior change — output is filtered for token savings.

| Do | Don't |
|----|-------|
| `rtk git status` | `git status` |
| `rtk git diff --cached` | `git diff --cached` |
| `rtk git log -5 --oneline` | `git log -5 --oneline` |
| `rtk npm run build` | `npm run build` |
| `rtk grep "pattern" .` | `grep "pattern" .` |

## Overrides other instructions

When global or project **commit**, **PR**, or **changelog** workflows show bare `git status`, `git diff`, or `git log`, **use the `rtk` form anyway**. Those workflows describe *what* to run, not the literal string.

Parallel git for commit prep:

```bash
rtk git status
rtk git diff
rtk git log -5 --oneline
```

PR / changelog diff scope (host repo):

| Scope | Commands |
|-------|----------|
| `-all` | `rtk git diff HEAD` and `rtk git status` |
| default / `-stage` | `rtk git diff --cached` and `rtk git status` |

## Exceptions

- **Unsupported commands** — run as usual (`python …`, `npm install`, `node …`, `gradle …`, `ssh …`). See `AGENTS.md` "NOT RTK-supported" list.
- **Debugging** — need full verbose output; run raw command without `rtk`.
- **Unsure** — `rtk rewrite '<command>'`; if result starts with `rtk`, use that form.

## Hook + explicit prefix

Project hook [`.codex/hooks/rtk-rewrite.sh`](../hooks/rtk-rewrite.sh) may rewrite Shell commands at `preToolUse`. Still **emit** `rtk …` when you choose the command — clearer transcripts and consistent with Codex/AGENTS.md.

## Prefer shell over Read/Grep when RTK helps

Built-in Read/Grep/Glob bypass the hook. For large search or file reads, prefer `rtk read`, `rtk grep`, or `rtk find` when compact output is enough.
