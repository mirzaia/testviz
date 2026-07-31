# Changelog

All notable changes to TestViz will be documented in this file.

## [1.0.1]

### Added
- Agent automation infrastructure for PRs and Changelogs using `.codex` rules and skills.
- RTK integration for token-optimized shell commands.
- Standardized templates for technical PR summaries and project changelogs.
- CLI generation for Mermaid, SVG, PNG, PPTX, and DOCX outputs.
- Table visualization support in the web UI.
- ISTQB DOCX report and PPTX slide generators.

### Changed

- Updated generator interfaces, flowchart rendering, web UI components, styles, README usage, and dependency metadata.

### Removed

- Removed legacy Codex hooks, rules, and prepare-release formatting files.

## [1.0.0] - 2026-07-28

Initial development release of TestViz.

### Added

- Monorepo workspace scaffold with NPM workspaces.
- Shared IR schema in `packages/core` using Zod validation.
- XML parsing package in `packages/parsers` with:
  - Auto-detection dispatcher
  - JUnit/Surefire XML parsing
  - Selenium/TestNG parsing
  - Appium XML parsing
  - Parser fixtures and tests
- Mermaid generation package in `packages/generators` with:
  - Mind map generator
  - Graph generator
  - Flowchart generator
  - Markdown table generator
  - CSV generator
  - Generator fixtures and tests
- React + Vite web UI in `packages/web-ui` with:
  - Drag-and-drop file upload
  - Sample data loading
  - Result summary dashboard
  - Mermaid diagram preview
  - Suite results table
  - Export actions for Mermaid, Markdown, CSV, and JSON
- CLI package in `packages/cli` with:
  - XML file input
  - Auto-detection and parsing
  - Output rendering to Mermaid, Markdown, CSV, JSON, or flowchart text
  - Optional file output
- Project documentation:
  - `README.md`
  - `PLAN.md`

### Changed

- Established a workspace-wide build and test flow.
- Added package-level `build` and `test` scripts so the full monorepo can be verified consistently.
- Switched package references to local file links for this environment.

### Verified

- `npm install`
- `npm test`
- `npm run build`
