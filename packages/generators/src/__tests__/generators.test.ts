import { describe, expect, it } from "vitest";
import { generateMindmap } from "../mermaid/mindmap";
import { generateGraph } from "../mermaid/graph";
import { generateFlowchart } from "../mermaid/flowchart";
import { generateMarkdownTable } from "../table/markdown";
import { generateCsv } from "../table/csv";
import { generatePptx } from "../slides/pptx";
import { generateIstqbDocx } from "../report/istqb-docx";
import { sampleRun } from "./fixtures";

describe("generator outputs", () => {
  it("renders a mindmap with suite and test nodes", () => {
    const output = generateMindmap(sampleRun);
    expect(output).toContain("mindmap");
    expect(output).toContain("LoginSuite");
    expect(output).toContain("shouldRejectInvalidUser");
  });

  it("renders a graph with result counts", () => {
    const output = generateGraph(sampleRun);
    expect(output).toContain("xychart-beta");
    expect(output).toContain('title "Test Results (junit)"');
    expect(output).toContain("bar [1, 1, 1, 0]");
  });

  it("renders a flowchart with branching suite nodes", () => {
    const output = generateFlowchart(sampleRun);
    expect(output).toContain("flowchart TD");
    expect(output).toContain('S0["LoginSuite"]');
    expect(output).toContain('C0_1["shouldRejectInvalidUser (failed)"]');
    expect(output).toContain("Z[Done]");
  });

  it("renders markdown table output", () => {
    const output = generateMarkdownTable(sampleRun);
    expect(output).toContain("# TestViz Results");
    expect(output).toContain("| Suite | Test | Class | Status | Duration (ms) |");
    expect(output).toContain("| LoginSuite | shouldLogin | demo.LoginTest | passed | 40 |");
  });

  it("renders CSV output", () => {
    const output = generateCsv(sampleRun);
    expect(output).toContain('"suite","test","className","status","durationMs"');
    expect(output).toContain('"CheckoutSuite","shouldSkipWhenCartEmpty","demo.CheckoutTest","skipped","60"');
  });

  it("generates a PowerPoint presentation", async () => {
    const output = await generatePptx(sampleRun).write({ outputType: "nodebuffer" });
    expect(output).toBeInstanceOf(Uint8Array);
    if (!(output instanceof Uint8Array)) throw new Error("Expected a binary PowerPoint payload");
    expect(output.byteLength).toBeGreaterThan(1000);
  });

  it("generates an ISTQB-style DOCX report", async () => {
    const output = await generateIstqbDocx(sampleRun);
    expect(output).toBeInstanceOf(Buffer);
    expect(output.byteLength).toBeGreaterThan(1000);
  });
});
