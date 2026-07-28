# PR summary format (Bitbucket / SourceTree)

Used by `@prepare-release` and `@pr-generator-rule`.

## Analysis rules

- **Strict diff:** Describe only technical "what." No "why," no business context, no inference.
- **Minimalism:** Single-line bullet points only.
- Do not invent changes not supported by the diff.

## Output rules

- **Container:** One code block for one-click copy.
- **Style:** Pure plain text inside the block. No markdown headers (`#`), bold (`**`), or italics (`*`) inside the block.
- **Structure:**

```
Summary: [One sentence technical summary]

Removed:
- [Item 1]

Added:
- [Item 1]
```

(Omit empty `Removed` or `Added` sections.)

## Optional sections

If the diff is mostly modifications with few adds/removes, you may add:

```
Changed:
- [Item 1]
```

Only include `Changed` when renames/refactors do not fit cleanly under Added/Removed. Prefer Added/Removed when the diff is clearly additive or deletive.
