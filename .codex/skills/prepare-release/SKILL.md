---
name: prepare-release
description: >-
  Generate Bitbucket PR summary and/or update CHANGELOG.md from git diff in the
  repository that hosts this skill. Never targets another git root in a multi-root
  workspace. Pair with @pr-generator-rule or @write-changelog (rule or skill) for
  single-artifact runs.
disable-model-invocation: true
---

# Prepare release (PR + changelog)

**Single source of truth** for `@prepare-release`, `@pr-generator-rule`, and `@write-changelog` (rule or skill).

**Scope:** The git repository that contains `.codex/skills/prepare-release/SKILL.md` (the **host repo**). All git commands and `CHANGELOG.md` edits use that root only.

## When to use

| Attach / invoke | Run |
|-----------------|-----|
| `@prepare-release` | PR summary **and** changelog update when `CHANGELOG.md` exists (PR only if it does not) |
| `@pr-generator-rule` (rule or [skill](../pr-generator-rule/SKILL.md)) | PR summary only — [pr-format.md](pr-format.md) |
| `@write-changelog` (rule or [skill](../write-changelog/SKILL.md)) | Changelog only — [changelog-format.md](changelog-format.md) |
| Both `@pr-generator-rule` and `@write-changelog` | Same as `@prepare-release` |

Also use when the user says "PR and changelog", "prepare release", or "ship this branch".

## On attach (required)

**As soon as this skill or a linked rule is in context**, run the workflow below **in this turn**. Do not wait for "write PR", "update changelog", or similar.

**Do not** re-run on unrelated turns unless the user attaches again or explicitly asks.

## Workflow

```text
- [ ] 1. Resolve host repo + diff scope (once)
- [ ] 2. Run git diff / status in host repo
- [ ] 3. PR summary (if mode includes PR)
- [ ] 4. Changelog (if mode includes changelog **and** `CHANGELOG.md` exists)
```

### Step 1 — Host repo and diff scope

**Host repo (required):**

1. Locate this skill at `.codex/skills/prepare-release/SKILL.md`.
2. Resolve its git root (directory returned by `rtk git rev-parse --show-toplevel` from that path).
3. Run **all** git commands with `working_directory` set to that root. **Prefix with `rtk`** (see `@rtk-shell` / `AGENTS.md`).
4. **Do not** switch to another git root based on multi-root workspace layout, active editor file, user-named folder, or where edits happened this session.

If the skill path is not inside a git repository, say so briefly and stop.

**Diff scope** — read flags from the **user's message in this chat**:

| User includes | Scope | Git commands (always `rtk` prefix) |
|---------------|-------|-----------------------------------|
| `-all` | Staged + unstaged vs `HEAD` | `rtk git diff HEAD` (+ `rtk git status` for context) |
| `-stage` or **(none)** | Staged index vs `HEAD` (default) | `rtk git diff --cached` (+ `rtk git status`) |

Run diff **once**; reuse the same analysis for PR and changelog.

If there are no changes for the chosen scope, say so briefly and stop.

### Step 2 — Mode selection

| Context | Mode |
|---------|------|
| `@prepare-release` only | `both` |
| `@pr-generator-rule` (rule or skill) only | `pr` |
| `@write-changelog` (rule or skill) only | `changelog` |
| Both PR and changelog rules/skills attached | `both` |
| User message says "PR only" / "changelog only" | Override to that mode |

### Step 3 — PR summary (`pr` or `both`)

Follow [pr-format.md](pr-format.md):

- Strict diff: technical **what** only — no why, no business context, no inference.
- Single plain-text code block for Bitbucket/SourceTree copy-paste.

### Step 4 — Changelog (`changelog` or `both`)

**No `CHANGELOG.md`:** If the host repo has no `CHANGELOG.md` at its root, **skip this step** — do not create one, do not ask. For mode `both`, still run Step 3 (PR) and finish. For mode `changelog` only (`@write-changelog`), say briefly that the host repo has no changelog file and stop.

Follow [changelog-format.md](changelog-format.md):

1. Use `CHANGELOG.md` at the **host repo** root.
2. Read the latest entry for version/date pattern.
3. **Default:** apply update under the correct version section.
4. **`preview only` / `do not edit`:** show proposed markdown block only — do not write the file.
5. Otherwise edit `CHANGELOG.md` (attach = approval to update unless preview-only).

When mode is `both`, output the **PR block first**, then apply or preview the changelog.

## Optional modifiers (same turn as attach)

| User includes | Behavior |
|---------------|----------|
| `-all` | Diff scope: working tree vs `HEAD` |
| `-stage` or (none) | Diff scope: staged vs `HEAD` |
| `preview only` / `no commit` | Changelog: propose only, no file edit |
| `PR only` | Skip changelog |
| `changelog only` | Skip PR block |

## Examples

**Both (recommended):**

```
@prepare-release
```

**Both with full working tree:**

```
@prepare-release -all
```

**Changelog preview without editing:**

```
@write-changelog preview only
```

**PR only:**

```
@pr-generator-rule -stage
```
