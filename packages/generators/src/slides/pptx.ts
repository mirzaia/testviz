import PptxGenJS from "pptxgenjs";
import type { TestRun } from "@testviz/core";

// PptxGenJS is CommonJS; this also supports runtime TypeScript loaders that
// expose its default export one level deeper.
const PptxGenJSConstructor = (PptxGenJS as unknown as { default?: typeof PptxGenJS }).default ?? PptxGenJS;

const STATUS_COLORS: Record<string, string> = {
  passed: "2E7D32",
  failed: "C62828",
  skipped: "EF6C00",
  error: "6A1B9A",
};

/** Creates a presentation that can be written with `presentation.writeFile()`. */
export function generatePptx(run: TestRun): PptxGenJS {
  const presentation = new PptxGenJSConstructor();
  presentation.layout = "LAYOUT_WIDE";
  presentation.author = "TestViz";
  presentation.company = "TestViz";
  presentation.subject = "Test automation results";
  presentation.title = `TestViz report — ${run.metadata.tool}`;

  const title = presentation.addSlide();
  title.background = { color: "F7F9FC" };
  title.addText("Test Automation Report", { x: 0.7, y: 0.65, w: 11.9, h: 0.5, fontSize: 28, bold: true, color: "172B4D" });
  title.addText(`${run.metadata.framework} · ${run.metadata.tool} · ${run.metadata.timestamp}`, { x: 0.7, y: 1.25, w: 11.9, h: 0.3, fontSize: 12, color: "52606D" });

  const metrics = [
    ["Total", run.metadata.total, "2563EB"],
    ["Passed", run.metadata.passed, STATUS_COLORS.passed],
    ["Failed", run.metadata.failed, STATUS_COLORS.failed],
    ["Skipped", run.metadata.skipped, STATUS_COLORS.skipped],
    ["Errors", run.metadata.errors, STATUS_COLORS.error],
  ];
  metrics.forEach(([label, value, color], index) => {
    const x = 0.7 + index * 2.45;
    title.addShape(presentation.ShapeType.roundRect, { x, y: 2.1, w: 2.15, h: 1.25, rectRadius: 0.08, fill: { color: "FFFFFF" }, line: { color: "D9E2EC" } });
    title.addText(String(value), { x, y: 2.32, w: 2.15, h: 0.35, align: "center", fontSize: 24, bold: true, color: String(color) });
    title.addText(String(label), { x, y: 2.8, w: 2.15, h: 0.2, align: "center", fontSize: 10, color: "52606D" });
  });

  const summary = presentation.addSlide();
  summary.addText("Suite Summary", { x: 0.7, y: 0.5, w: 12, h: 0.4, fontSize: 24, bold: true, color: "172B4D" });
  const suiteRows = run.suites.map((suite) => [suite.name, suite.status, String(suite.tests.length), String(Math.round(suite.duration))]);
  summary.addTable(
    toTableRows([["Suite", "Status", "Tests", "Duration (ms)"], ...suiteRows]),
    { x: 0.7, y: 1.2, w: 11.9, border: { type: "solid", color: "D9E2EC" }, fill: { color: "FFFFFF" }, color: "172B4D", fontSize: 12, rowH: 0.35, bold: false,
      colW: [6.4, 2, 1.4, 2.1],
      margin: 0.08,
    }
  );

  for (const suite of run.suites) {
    const slide = presentation.addSlide();
    slide.addText(suite.name, { x: 0.7, y: 0.45, w: 10, h: 0.4, fontSize: 24, bold: true, color: "172B4D" });
    slide.addText(`${suite.status.toUpperCase()} · ${suite.tests.length} tests · ${Math.round(suite.duration)} ms`, { x: 0.7, y: 0.95, w: 11.9, h: 0.25, fontSize: 11, color: STATUS_COLORS[suite.status] });
    const testRows = suite.tests.map((test) => [test.name, test.className, test.status, String(Math.round(test.duration))]);
    slide.addTable(
      toTableRows([["Test", "Class", "Status", "Duration (ms)"], ...testRows]),
      { x: 0.7, y: 1.4, w: 11.9, border: { type: "solid", color: "D9E2EC" }, fill: { color: "FFFFFF" }, color: "172B4D", fontSize: 10, rowH: 0.3,
        colW: [4.4, 3.7, 1.7, 2.1], margin: 0.06,
      }
    );
  }

  return presentation;
}

function toTableRows(rows: string[][]): PptxGenJS.TableRow[] {
  return rows.map((row) => row.map((text) => ({ text })));
}
