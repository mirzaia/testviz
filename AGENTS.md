<!-- headroom:rtk-instructions -->
# RTK (Rust Token Killer) - Token-Optimized Commands

When running shell commands, prefix with `rtk` **only when RTK supports that command** (see list below). Commands RTK does not support run **as usual without the prefix**.

RTK reduces LLM context usage by 60-90% on filtered commands with zero behavior change.

## Mandatory (Cursor Agent)

**Every** Shell tool command **MUST** use the `rtk` prefix when RTK supports it (list below). This includes commit prep, PR/changelog diffs, builds, lint, and tests — even when other instructions show bare `git status` or `git diff`.

**Exceptions:** debugging (need raw output); commands RTK does not support (see bottom of this file).

**Unsure:** `rtk rewrite '<command>'` — if output starts with `rtk`, use that form.

**Hook:** When `.cursor/hooks/rtk-rewrite.sh` is active, still **emit** `rtk …` in Shell tool calls when you choose the command (clearer transcripts; belt-and-suspenders with the hook).

## When to use rtk

- **Supported command** → **MUST** prefix with `rtk`: `git status` → `rtk git status`
- **Unsupported command** → run normally: `python script.py`, `npm install`, `node app.js`
- **Unsure** → run `rtk rewrite '<command>'`; if the result starts with `rtk`, use that rewritten form

## RTK-supported commands

Reference: https://github.com/rtk-ai/rtk

### Files & search
`ls`, `tree`, `read` (prefer over `cat`/`head`/`tail` for files), `smart`, `find`, `grep` (also `rg`), `diff`, `wc`, `log`

### Git & GitHub
`git` (all subcommands), `gh` (all subcommands)

### Tests
`err`, `test`, `pytest`, `vitest` (also `jest`), `playwright`, `cargo test`, `go test`, `dotnet test`/`dotnet build`

### Build & lint
`lint` (ESLint; `biome check` → `rtk lint`), `tsc`, `next`, `prettier`, `format`, `ruff`, `mypy`, `golangci-lint`, `cargo build`, `cargo clippy`, `make`

### Package managers
`npm run …`, `npx …` (routes to specialized filters), `pnpm install`, `pnpm list`, `pip` (incl. `uv pip`), `prisma`

### Infrastructure & cloud
`docker`, `kubectl`, `aws`, `psql`, `terraform`, `helm`, `dotnet`, `go`

### Data & analysis
`json`, `deps`, `env`, `curl`, `wget`, `summary`, `proxy`

### RTK meta
`gain`, `discover`, `session`, `config`, `verify`, `learn`, `cc-economics`, `hook-audit`

## Rules

- **Default:** prefix every RTK-supported Shell command with `rtk` — no exceptions for commit/PR/build workflows
- In command chains, prefix **only RTK-supported segments**: `rtk git add . && rtk git commit -m "msg"`
- For debugging or when you need full verbose output, run the raw command without `rtk`
- `rtk proxy <cmd>` runs without filtering but tracks usage

## Examples

```bash
# RTK-supported — use rtk prefix
rtk git status
rtk git diff
rtk git log
rtk ls src/
rtk read package.json
rtk grep "pattern" .
rtk find . -name "*.py"
rtk diff file1 file2
rtk pytest tests/
rtk cargo test
rtk go test ./...
rtk vitest
rtk playwright test
rtk tsc
rtk lint
rtk ruff check
rtk mypy .
rtk cargo build
rtk prettier --check .
rtk next build
rtk npm run build
rtk pnpm install
rtk pip list
rtk docker ps
rtk kubectl get pods
rtk aws s3 ls
rtk gh pr view 42
rtk gh run list
rtk gh issue list
rtk json config.json
rtk deps
rtk env -f AWS
rtk log app.log
rtk summary "<long command>"
rtk err "<cmd>"

# NOT RTK-supported — run as usual (no prefix)
python tools/export_csv_usage_status.py
npm install
pnpm run build
node script.js
echo "debug"
gradle build
ssh host
```

<!-- /headroom:rtk-instructions -->
