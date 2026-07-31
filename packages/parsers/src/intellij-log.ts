import type { TestCase, TestRun, TestSuite } from "@testviz/core";
import { buildMetadata, suiteStatusFromTests } from "./metadata";

function mapStatus(raw: string | undefined): TestCase["status"] {
  const value = (raw ?? "").toLowerCase();
  if (["failed", "failure", "fail"].includes(value)) return "failed";
  if (["error", "errored", "broken"].includes(value)) return "error";
  if (["skipped", "skip", "ignored", "pending", "undefined"].includes(value)) return "skipped";
  return "passed";
}

function parseCucumberDuration(value: string | undefined): number {
  if (!value) return 0;
  const trimmed = value.trim();
  const complex = trimmed.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+(?:\.\d+)?)s)?$/i);
  if (complex && (complex[1] || complex[2] || complex[3])) {
    const hours = Number(complex[1] ?? 0);
    const minutes = Number(complex[2] ?? 0);
    const seconds = Number(complex[3] ?? 0);
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
  const ms = trimmed.match(/^([\d.]+)\s*ms$/i);
  if (ms) return Number(ms[1]) || 0;
  return 0;
}

function featureFromFailedLine(line: string): string | undefined {
  const match = line.match(/#\s*(.+)$/);
  return match?.[1]?.trim();
}

function featureFromPath(pathLike: string): string {
  const base = pathLike.split(/[/\\]/).pop() ?? pathLike;
  return base.replace(/\.feature(?::\d+)?$/i, "").replace(/-test-data\.csv$/i, "");
}

/**
 * Company IntelliJ / Gradle Cucumber logs (NvTestRunner):
 * - "Scenario <name> execution status: PASSED|FAILED"
 * - Cucumber summary: "1 Scenarios (1 passed)" / "1 Scenarios (1 failed)"
 * - "Failed scenarios:" block with feature paths
 */
function parseNvCucumberLog(text: string): { tests: TestCase[]; duration: number } {
  const cases = new Map<string, TestCase>();
  const statusLine =
    /Scenario\s+(.+?)\s+execution status:\s*(PASSED|FAILED|ERROR|SKIPPED|PENDING|UNDEFINED)/gi;
  let match: RegExpExecArray | null;
  while ((match = statusLine.exec(text))) {
    const name = match[1].trim();
    cases.set(name, {
      name,
      className: "Cucumber",
      status: mapStatus(match[2]),
      duration: 0,
    });
  }

  const failedBlock = text.match(/Failed scenarios:\s*\n([\s\S]*?)(?:\n\s*\n|\n\d+\s+Scenarios)/i);
  if (failedBlock) {
    for (const line of failedBlock[1].split(/\r?\n/)) {
      const name = featureFromFailedLine(line);
      if (!name) continue;
      const existing = cases.get(name);
      if (existing) {
        existing.status = "failed";
      } else {
        cases.set(name, {
          name,
          className: featureFromPath(line),
          status: "failed",
          duration: 0,
        });
      }
    }
  }

  const failureDetail =
    /Execution failure for scenario:\s*(.+?)\s+error\s*:\s*\[([^\]]*)\]/gi;
  while ((match = failureDetail.exec(text))) {
    const name = match[1].trim();
    const existing = cases.get(name) ?? {
      name,
      className: "Cucumber",
      status: "failed" as const,
      duration: 0,
    };
    existing.status = "failed";
    existing.errorMessage = match[2].slice(0, 500) || existing.errorMessage;
    cases.set(name, existing);
  }

  let duration = 0;
  const summary = [
    ...text.matchAll(
      /(\d+)\s+Scenarios?\s*\(([^)]+)\)\s*\n\s*(\d+)\s+Steps?\s*\(([^)]+)\)\s*\n\s*([0-9]+h)?([0-9]+m)?([0-9]+(?:\.[0-9]+)?s)/gi
    ),
  ];
  const last = summary.at(-1);
  if (last) {
    duration = parseCucumberDuration(`${last[5] ?? ""}${last[6] ?? ""}${last[7] ?? ""}`);
  }

  // If no per-scenario lines, synthesize from the last Cucumber summary
  if (!cases.size && last) {
    const counts = parseStatusCounts(last[2]);
    const featureHint =
      text.match(/scenario-storage\/(.+?)-test-data\.csv/i)?.[1] ??
      text.match(/#\s*(.+)$/m)?.[1] ??
      "Cucumber scenario";
    pushSynthetic(cases, featureHint.trim(), counts);
  }

  // Spread duration evenly across scenarios when known
  if (cases.size && duration > 0) {
    const each = Math.round(duration / cases.size);
    for (const test of cases.values()) test.duration = each;
  }

  return { tests: [...cases.values()], duration };
}

function parseStatusCounts(inner: string): Record<TestCase["status"], number> {
  const counts = { passed: 0, failed: 0, error: 0, skipped: 0 };
  for (const part of inner.split(",")) {
    const match = part.trim().match(/^(\d+)\s+(passed|failed|pending|undefined|skipped|broken)$/i);
    if (!match) continue;
    const status = mapStatus(match[2]);
    counts[status] += Number(match[1]) || 0;
  }
  return counts;
}

function pushSynthetic(cases: Map<string, TestCase>, baseName: string, counts: Record<TestCase["status"], number>) {
  let index = 1;
  for (const status of ["passed", "failed", "error", "skipped"] as const) {
    for (let i = 0; i < counts[status]; i++) {
      const name = counts.passed + counts.failed + counts.error + counts.skipped === 1 ? baseName : `${baseName} (${status} ${index++})`;
      cases.set(name, { name, className: "Cucumber", status, duration: 0 });
    }
  }
}

function parseTeamCity(text: string): TestCase[] {
  const cases = new Map<string, TestCase>();
  const started = /##teamcity\[testStarted\s+name='([^']*)'/g;
  const finished = /##teamcity\[testFinished\s+name='([^']*)'(?:\s+duration='([^']*)')?/g;
  const failed = /##teamcity\[testFailed\s+name='([^']*)'(?:\s+message='([^']*)')?/g;
  const ignored = /##teamcity\[testIgnored\s+name='([^']*)'/g;
  let match: RegExpExecArray | null;
  while ((match = started.exec(text))) {
    const name = match[1];
    cases.set(name, { name, className: name.includes(".") ? name.split(".").slice(0, -1).join(".") : "", status: "passed", duration: 0 });
  }
  while ((match = failed.exec(text))) {
    const name = match[1];
    const existing = cases.get(name) ?? { name, className: "", status: "failed" as const, duration: 0 };
    existing.status = "failed";
    existing.errorMessage = match[2];
    cases.set(name, existing);
  }
  while ((match = ignored.exec(text))) {
    const name = match[1];
    const existing = cases.get(name) ?? { name, className: "", status: "skipped" as const, duration: 0 };
    existing.status = "skipped";
    cases.set(name, existing);
  }
  while ((match = finished.exec(text))) {
    const existing = cases.get(match[1]);
    if (existing && match[2]) existing.duration = Number(match[2]) || 0;
  }
  return [...cases.values()];
}

function groupSuites(tests: TestCase[]): TestSuite[] {
  const byClass = new Map<string, TestCase[]>();
  for (const test of tests) {
    const key = test.className || "IntelliJ Run";
    const list = byClass.get(key) ?? [];
    list.push(test);
    byClass.set(key, list);
  }
  return [...byClass.entries()].map(([name, suiteTests]) => ({
    name,
    status: suiteStatusFromTests(suiteTests),
    duration: suiteTests.reduce((total, test) => total + test.duration, 0),
    tests: suiteTests,
  }));
}

export function parseIntellijLog(text: string, source = "local"): TestRun {
  const cucumber = parseNvCucumberLog(text);
  const tests = cucumber.tests.length ? cucumber.tests : parseTeamCity(text);
  const suites = tests.length
    ? groupSuites(tests)
    : [{ name: "IntelliJ Run", status: "passed" as const, duration: 0, tests: [] as TestCase[] }];

  if (cucumber.duration > 0) {
    for (const suite of suites) {
      if (!suite.duration) suite.duration = cucumber.duration;
    }
  }

  return {
    metadata: buildMetadata(suites, source, "intellij", "IntelliJ / Cucumber"),
    suites,
  };
}

export function looksLikeIntellijLog(text: string): boolean {
  return (
    /Scenario\s+.+\s+execution status:\s*(PASSED|FAILED)/i.test(text) ||
    /\d+\s+Scenarios?\s*\(/i.test(text) ||
    /\bNvTestRunner\b/.test(text) ||
    /\brunCucumber\b/i.test(text) ||
    /##teamcity\[test(Started|Finished|Failed|Ignored)/i.test(text) ||
    /\bProcess finished with exit code\b/i.test(text) ||
    /\bBUILD (SUCCESSFUL|FAILED)\b/i.test(text) ||
    /Execution finished '/i.test(text)
  );
}
