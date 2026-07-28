import { useMemo, useRef, useState } from "react";
import type { TestRun } from "@testviz/core";
import { detectAndParse } from "@testviz/parsers";
import { generateFlowchart, generateGraph, generateMindmap } from "@testviz/generators";
import { ExportPanel } from "./components/ExportPanel";
import { MermaidView } from "./components/MermaidView";
import { StatCard } from "./components/StatCards";

const sampleXml = `<testsuite name="Example Suite" tests="2" failures="1" errors="0" skipped="0" time="0.12">
  <testcase classname="demo.LoginTest" name="shouldLogin" time="0.05" />
  <testcase classname="demo.LoginTest" name="shouldRejectInvalidUser" time="0.07">
    <failure message="Assertion failed">Expected error message</failure>
  </testcase>
</testsuite>`;

export default function App() {
  const [run, setRun] = useState<TestRun>(() => detectAndParse(sampleXml));
  const [tab, setTab] = useState<"mindmap" | "graph" | "flowchart">("mindmap");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("sample.xml");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mermaid = useMemo(() => {
    if (tab === "graph") return generateGraph(run);
    if (tab === "flowchart") return generateFlowchart(run);
    return generateMindmap(run);
  }, [run, tab]);
  const summary = useMemo(() => {
    const allTests = run.suites.flatMap((suite) => suite.tests);
    const durations = allTests.map((test) => test.duration);
    return {
      suites: run.suites.length,
      tests: allTests.length,
      passed: run.metadata.passed,
      failed: run.metadata.failed,
      skipped: run.metadata.skipped,
      errors: run.metadata.errors,
      duration: run.metadata.duration,
      longest: durations.length ? Math.max(...durations) : 0,
      shortest: durations.length ? Math.min(...durations) : 0,
    };
  }, [run]);
  const csv = useMemo(() => {
    const rows = [["suite", "test", "className", "status", "durationMs"]];
    for (const suite of run.suites) {
      for (const test of suite.tests) {
        rows.push([suite.name, test.name, test.className, test.status, String(test.duration)]);
      }
    }
    return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  }, [run]);
  const markdown = useMemo(
    () => `# TestViz Report\n\n## Metadata\n\`\`\`json\n${JSON.stringify(run.metadata, null, 2)}\n\`\`\`\n\n## Suites\n${run.suites
      .map(
        (suite) =>
          `- **${suite.name}** (${suite.status}) - ${suite.tests.length} tests\n${suite.tests
            .map((test) => `  - ${test.name} (${test.status}, ${test.duration}ms)`)
            .join("\n")}`
      )
      .join("\n")}`,
    [run]
  );

  function loadXml(text: string, name = "upload.xml") {
    setRun(detectAndParse(text, "local", name));
    setFileName(name);
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    file.text().then((text) => loadXml(text, file.name));
  }

  return (
    <div className="shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">TestViz</p>
          <h1>Upload test automation output and visualize it instantly.</h1>
          <p className="lede">Parse JUnit-style XML, inspect results, and switch between Mermaid mind map, chart, and flowchart views.</p>
        </div>
        <div className="hero-badges">
          <span>{summary.tests} tests</span>
          <span>{summary.failed} failed</span>
          <span>{Math.round(summary.duration)} ms</span>
        </div>
      </header>
      <main className="layout">
        <section className="panel upload">
          <div className="panel-heading">
            <h2>Input</h2>
            <button className="ghost" onClick={() => fileInputRef.current?.click()}>Browse files</button>
          </div>
          <div
            className={isDragging ? "dropzone dragging" : "dropzone"}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleFiles(event.dataTransfer.files);
            }}
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={async (event) => {
                handleFiles(event.target.files);
              }}
            />
            <div>
              <strong>Drop XML here</strong>
              <p>or click to browse a file from your machine.</p>
              <small>{fileName}</small>
            </div>
          </div>
          <div className="action-row">
            <button className="ghost" onClick={() => loadXml(sampleXml, "sample.xml")}>Load sample</button>
            <button
              className="ghost"
              onClick={() => navigator.clipboard?.writeText(JSON.stringify(run, null, 2))}
            >
              Copy JSON
            </button>
          </div>
          <div className="file-meta">
            <span>Source: {run.metadata.source}</span>
            <span>Framework: {run.metadata.framework}</span>
            <span>Tool: {run.metadata.tool}</span>
          </div>
        </section>
        <section className="panel">
          <div className="dashboard-top">
            <div>
              <p className="section-label">Dashboard</p>
              <h2>{summary.suites} suites loaded</h2>
            </div>
            <div className="status-pill">{tab} view</div>
          </div>
          <div className="stats-grid">
            <StatCard label="Suites" value={summary.suites} accent="blue" />
            <StatCard label="Tests" value={summary.tests} accent="teal" />
            <StatCard label="Passed" value={summary.passed} accent="green" />
            <StatCard label="Failed" value={summary.failed} accent="red" />
            <StatCard label="Skipped" value={summary.skipped} accent="amber" />
            <StatCard label="Errors" value={summary.errors} accent="violet" />
          </div>
          <div className="tabs">
            {(["mindmap", "graph", "flowchart"] as const).map((value) => (
              <button key={value} className={value === tab ? "tab active" : "tab"} onClick={() => setTab(value)}>
                {value}
              </button>
            ))}
          </div>
          <MermaidView diagram={mermaid} />
          <div className="insight-grid">
            <div className="insight-card">
              <h3>Duration</h3>
              <p>{Math.round(summary.duration)} ms total</p>
            </div>
            <div className="insight-card">
              <h3>Fastest case</h3>
              <p>{summary.shortest} ms</p>
            </div>
            <div className="insight-card">
              <h3>Longest case</h3>
              <p>{summary.longest} ms</p>
            </div>
          </div>
          <table className="results">
            <thead>
              <tr>
                <th>Suite</th>
                <th>Status</th>
                <th>Tests</th>
              </tr>
            </thead>
            <tbody>
              {run.suites.map((suite) => (
                <tr key={suite.name}>
                  <td>{suite.name}</td>
                  <td>{suite.status}</td>
                  <td>{suite.tests.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ExportPanel mermaid={mermaid} markdown={markdown} csv={csv} json={JSON.stringify(run, null, 2)} />
        </section>
      </main>
    </div>
  );
}
function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
