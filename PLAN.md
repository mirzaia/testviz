# TestViz — Test Automation Visualization Tool

## Goal
A tool that ingests test automation reports/logs from various sources and formats, then visualizes the results in multiple output formats (mind map, graphs, flowchart, table, slides, structured report).

---

## Architecture

### Monorepo layout (NPM workspaces)

```
testviz/
├── package.json              # root workspace config
├── packages/
│   ├── core/                 # IR schema type definitions + validation
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── schema.ts     # IR JSON schema types
│   │   │   ├── validate.ts   # JSON schema validation (Zod)
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   ├── parsers/              # Input format → IR
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts      # auto-detect dispatcher
│   │   │   ├── detector.ts   # hybrid: extension/filename → content sniffing
│   │   │   ├── junit-xml.ts  # JUnit/Surefire XML parser
│   │   │   ├── selenium-xml.ts # Selenium XML output parser
│   │   │   ├── appium-xml.ts # Appium JUnit XML parser
│   │   │   └── __tests__/
│   │   └── tsconfig.json
│   ├── generators/           # IR → output formats
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── mermaid/
│   │   │   │   ├── mindmap.ts
│   │   │   │   ├── graph.ts
│   │   │   │   ├── flowchart.ts
│   │   │   │   └── index.ts
│   │   │   ├── table/
│   │   │   │   ├── markdown.ts
│   │   │   │   └── csv.ts
│   │   │   ├── slides/
│   │   │   │   └── pptx.ts
│   │   │   ├── report/
│   │   │   │   └── istqb-docx.ts
│   │   │   └── __tests__/
│   │   └── tsconfig.json
│   ├── cli/                  # Optional CLI wrapper
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts      # entry point (commander/yargs)
│   │   │   └── commands/
│   │   └── tsconfig.json
│   └── web-ui/               # React + Vite web UI
│       ├── package.json
│       ├── index.html
│       ├── vite.config.ts
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── FileUpload.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   ├── MermaidView.tsx
│       │   │   ├── TableView.tsx
│       │   │   ├── StatsCards.tsx
│       │   │   └── ExportPanel.tsx
│       │   ├── hooks/
│       │   │   └── usePipeline.ts   # connects parser + generator in-browser
│       │   └── styles/
│       └── tsconfig.json
```

---

## Intermediate Representation (IR) Schema

```typescript
interface TestRun {
  metadata: {
    tool: string;          // "junit", "selenium", "appium", "playwright", etc.
    framework: string;     // "JUnit 5", "pytest", etc.
    source: string;        // local, bamboo, github-actions
    timestamp: string;     // ISO 8601
    duration: number;      // ms
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
  };
  suites: TestSuite[];
}

interface TestSuite {
  name: string;
  status: "passed" | "failed" | "skipped" | "error";
  duration: number;
  timestamp?: string;
  tests: TestCase[];
}

interface TestCase {
  name: string;
  className: string;
  status: "passed" | "failed" | "skipped" | "error";
  duration: number;
  errorMessage?: string;
  stackTrace?: string;
  steps?: TestStep[];
}

interface TestStep {
  name: string;
  status: "passed" | "failed" | "skipped" | "error";
  duration: number;
  screenshot?: string;   // base64 or path
}
```

Validation: Zod schema in `core/` package.

---

## Input Parsing (Phase 1)

### Hybrid auto-detection (`detector.ts`)
1. **Extension check**: `.xml` → try XML parsers in priority order
2. **Filename pattern**: `TEST-*.xml`, `surefire-report.xml`, `*-test-results.xml`
3. **Content sniffing**: root element check (`<testsuite>`, `<testng-results>`, `<ns:test-run>`)
4. Dispatch to the correct parser

### Parser implementations
- `junit-xml.ts` — parses `<testsuite>` / `<testcase>` elements (standard JUnit XML, Surefire, Failsafe)
- `selenium-xml.ts` — parses Selenium Grid XML output (similar structure, different attributes)
- `appium-xml.ts` — parses Appium JUnit XML output

Each parser returns a `TestRun` object.

---

## Output Generation (Phase 1)

### Mermaid generators (text-based)
- `mindmap.ts` — tree of suites → test cases → status
- `graph.ts` — bar/line/pie chart using mermaid XYChart or gantt
- `flowchart.ts` — execution flow: suites → cases with pass/fail branching

All generators produce raw mermaid syntax strings.

### Web UI rendering
- `MermaidView.tsx` component uses `mermaid.js` library to render the text client-side
- `ExportPanel.tsx` offers download as `.mmd` (mermaid source) or `.md` (embedded in markdown)

---

## Data Flow

```
User uploads file (or CLI passes path)
         │
         ▼
detector.ts ──► junit-xml.ts │ selenium-xml.ts │ appium-xml.ts
         │
         ▼
      TestRun (IR JSON)
         │
         ▼
generator (mindmap | graph | flowchart | table | ...)
         │
         ▼
Output: mermaid text │ .md │ .csv │ .pptx │ .docx
```

---

## Web UI Layout

```
┌────────────────────────────────────────────┐
│  Header: TestViz — Upload / Drop Zone      │
├────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────────────────┐│
│  │ Upload   │  │ Preview / Dashboard      ││
│  │ Panel    │  │                          ││
│  │ (drag &  │  │  Stats Cards             ││
│  │  drop)   │  │  (pass/fail/skip/dur.)   ││
│  │          │  │                          ││
│  │          │  │  Tab: Mind Map | Graph   ││
│  │          │  │       | Flowchart | Table││
│  │          │  │                          ││
│  │          │  │  Mermaid.js rendered     ││
│  │          │  │  diagram (per tab)       ││
│  │          │  │                          ││
│  │          │  │  Export Panel            ││
│  │          │  │  (.mmd / .md / .csv)     ││
│  └──────────┘  └──────────────────────────┘│
└────────────────────────────────────────────┘
```

---

## Implementation Order

### Milestone 1: Core + Parsers
1. Initialize monorepo with NPM workspaces (root `package.json`)
2. Create `core/` package with Zod schema for IR
3. Create `parsers/` package with `detector.ts` and `junit-xml.ts`
4. Create `parsers/` selenium-xml and appium-xml parsers
5. Unit tests for each parser (fixture XML files)

### Milestone 2: Generators
1. Create `generators/` package
2. Implement `mermaid/mindmap.ts` — suite → case tree
3. Implement `mermaid/graph.ts` — pass/fail counts, durations
4. Implement `mermaid/flowchart.ts` — execution flow
5. Unit tests for each generator

### Milestone 3: Web UI
1. Create `web-ui/` package with Vite + React + TypeScript
2. File upload component (drag & drop)
3. Hook up parser (in-browser via `parsers/` package)
4. `MermaidView.tsx` component rendering mermaid diagrams
5. Tabs for mind map / graph / flowchart
6. `StatsCards.tsx` summary
7. `ExportPanel.tsx` — download .mmd / .md

### Milestone 4: CLI
1. Create `cli/` package
2. Commands: `testviz parse <file>` (show IR), `testviz generate <file> --format mindmap` (output file)
3. Use `mermaid-cli` for non-interactive diagram export (SVG/PNG)

### Milestone 5: Extended Output (Phase 2)
1. Table generator (.md, .csv)
2. Slides generator (.pptx via pptxgenjs)
3. ISTQB report generator (.docx via docx)

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `zod` | IR schema validation |
| `fast-xml-parser` | XML parsing (JUnit, Selenium, Appium) |
| `mermaid` | Client-side diagram rendering |
| `papaparse` | CSV generation |
| `pptxgenjs` | PPTX generation |
| `docx` | DOCX generation |
| `commander` | CLI argument parsing |
| `@mermaid-js/mermaid-cli` | CLI diagram export |
| `react`, `react-dom`, `vite` | Web UI |
| `vitest` | Testing |

---

## Open Questions / Future Considerations
- **Screenshot embedding**: For Appium/Selenium test steps, screenshots (base64) can be embedded in the IR and displayed in the report/slides output
- **CI/CD integration**: The CLI can be added as a GitHub Action / Bamboo post-build step
- **Trend/history**: If multiple IR JSONs are combined, the tool could show pass/fail trends over time
- **Internationalization**: ISTQB standard has i18n considerations for report output