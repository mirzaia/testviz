import type { TestRun } from "@testviz/core";

export function generateCsv(run: TestRun): string {
  const rows = [["suite", "test", "className", "status", "durationMs"]];
  for (const suite of run.suites) {
    for (const test of suite.tests) {
      rows.push([suite.name, test.name, test.className, test.status, String(Math.round(test.duration))]);
    }
  }
  return rows.map((row) => row.map(quoteCell).join(",")).join("\n");
}

function quoteCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
