import type { TestRun } from "@testviz/core";

export function generateMarkdownTable(run: TestRun): string {
  const lines = [
    "# TestViz Results",
    "",
    `- Tool: ${run.metadata.tool}`,
    `- Framework: ${run.metadata.framework}`,
    `- Total: ${run.metadata.total}`,
    `- Passed: ${run.metadata.passed}`,
    `- Failed: ${run.metadata.failed}`,
    `- Skipped: ${run.metadata.skipped}`,
    `- Errors: ${run.metadata.errors}`,
    "",
    "| Suite | Test | Class | Status | Duration (ms) |",
    "| --- | --- | --- | --- | ---: |",
  ];

  for (const suite of run.suites) {
    for (const test of suite.tests) {
      lines.push(
        `| ${escapeCell(suite.name)} | ${escapeCell(test.name)} | ${escapeCell(test.className)} | ${test.status} | ${Math.round(test.duration)} |`
      );
    }
  }

  return lines.join("\n");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}
