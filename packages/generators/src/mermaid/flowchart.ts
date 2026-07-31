import type { TestRun } from "@testviz/core";

export function generateFlowchart(run: TestRun): string {
  const lines = ["flowchart TD", "  A[Start] --> B[Load results]"];
  let previous = "B";
  run.suites.forEach((suite, suiteIndex) => {
    const suiteNode = `S${suiteIndex}`;
    lines.push(`  ${suiteNode}["${escapeLabel(suite.name)}"]`);
    lines.push(`  ${previous} --> ${suiteNode}`);
    previous = suiteNode;
    suite.tests.forEach((test, testIndex) => {
      const caseNode = `C${suiteIndex}_${testIndex}`;
      lines.push(`  ${caseNode}["${escapeLabel(`${test.name} (${test.status})`)}"]`);
      lines.push(`  ${suiteNode} --> ${caseNode}`);
    });
  });
  lines.push(`  ${previous} --> Z[Done]`);
  return lines.join("\n");
}

function escapeLabel(value: string): string {
  return value.replace(/"/g, "#quot;").replace(/[\r\n]+/g, " ");
}
