import type { TestRun } from "@testviz/core";

export function generateGraph(run: TestRun): string {
  return [
    "xychart-beta",
    `  title "Test Results (${run.metadata.tool})"`,
    `  x-axis ["Passed", "Failed", "Skipped", "Errors"]`,
    `  y-axis "Count" 0 --> ${Math.max(1, run.metadata.total)}`,
    `  bar [${run.metadata.passed}, ${run.metadata.failed}, ${run.metadata.skipped}, ${run.metadata.errors}]`,
  ].join("\n");
}
