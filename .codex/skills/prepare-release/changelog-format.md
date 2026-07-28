# Changelog format (Keep a Changelog)

Used by `@prepare-release` and `@write-changelog`.

## File location

`CHANGELOG.md` at the **host repo** root — the git root that contains `.codex/skills/prepare-release/SKILL.md`.

**Missing file:** If `CHANGELOG.md` does not exist, skip the changelog task entirely (no create, no prompt). `@prepare-release` still outputs the PR summary when applicable.

## Structure

### Order

- Newest release at the **top** of the file.

### Categories (one-word headings)

- Added, Changed, Fixed, Removed, Deprecated, Security

Use only categories that have bullets. Omit empty sections.

### Release header

```md
## [x.y.z] - YYYY-MM-DD
```

- Use ISO 8601 dates.
- Bump version logically from the latest entry if the user did not specify a version.
- If an unreleased section already exists at the top (`## [Unreleased]` or in-progress version), append bullets there instead of creating a duplicate header.

## Writing rules

- User-facing, concise bullets.
- Match tone and granularity of existing entries in that project's `CHANGELOG.md`.
- Do not invent changes not supported by the diff.
- Map diff hunks to categories:
  - New files/features → **Added**
  - Bug fixes → **Fixed**
  - Behavior/API changes → **Changed**
  - Deletions → **Removed**
  - Deprecation notices → **Deprecated**
  - Security fixes → **Security**

## Preview vs edit

| User message | Action |
|--------------|--------|
| (default) | Edit `CHANGELOG.md` |
| `preview only` / `do not edit` / `no commit` | Show proposed markdown block only |
