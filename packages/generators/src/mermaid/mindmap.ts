import type { TestRun } from "@testviz/core";

export function generateMindmap(run: TestRun): string {
  const lines = ["mindmap", "  root((TestViz))"];
  for (const suite of run.suites) {
    lines.push(`    ${escapeNode(suite.name)}[${suite.name}]`);
    for (const test of suite.tests) {
      lines.push(`      ${escapeNode(test.name)}(${test.name} - ${test.status})`);
    }
  }
  return lines.join("\n");
}

function escapeNode(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]+/g, "_");
}
