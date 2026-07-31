# TestViz

TestViz is a small workspace for loading test automation reports, turning them into a shared intermediate representation, and visualizing the results in a browser.

## What it does

- Parses JUnit-style XML test output
- Normalizes results into a shared IR
- Generates Mermaid mind maps, graphs, and flowcharts, plus Markdown/CSV tables, PPTX slides, and ISTQB-style DOCX reports
- Renders a dashboard with summary cards, suite tables, and export actions

## Workspace layout

- `packages/core` - shared IR schema and validation
- `packages/parsers` - XML detection and parsing
- `packages/generators` - Mermaid generators
- `packages/web-ui` - Vite + React UI

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the web app:

```bash
npm run dev
```

3. Open the local Vite URL shown in the terminal.

## Build and typecheck

```bash
npm run build
npm run typecheck
```

## Using the UI

1. Drag and drop a `.xml` report into the upload panel, or click to browse.
2. Switch between the `mindmap`, `graph`, `flowchart`, and `table` tabs.
3. Use the export panel to download Mermaid, Markdown, CSV, or JSON output.

## CLI

```bash
# Print the normalized intermediate representation
npm run testviz -- parse report.xml

# Write Mermaid source or a table/report artifact
npm run testviz -- generate report.xml --format mindmap --output report.mmd
npm run testviz -- generate report.xml --format pptx --output report.pptx
npm run testviz -- generate report.xml --format docx --output report.docx

# Render a Mermaid diagram to an image
npm run testviz -- generate report.xml --format svg --diagram graph --output results.svg
npm run testviz -- generate report.xml --format png --diagram flowchart --output results.png
```

## Notes

- The current parsers are intentionally lightweight and cover a solid JUnit-style baseline.
- Selenium and Appium parsers currently reuse the JUnit parsing path as a first implementation pass.
- If you add more report formats, update the parser detector and the shared schema together.
