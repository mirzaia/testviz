import type { TestCase, TestRun, TestSuite } from "@testviz/core";

export function suiteStatusFromTests(tests: TestCase[]): TestSuite["status"] {
  if (tests.some((test) => test.status === "error")) return "error";
  if (tests.some((test) => test.status === "failed")) return "failed";
  if (tests.some((test) => test.status === "skipped")) return "skipped";
  return "passed";
}

export function buildMetadata(
  suites: TestSuite[],
  source: string,
  tool: string,
  framework: string,
  timestamp?: string
): TestRun["metadata"] {
  const totals = suites.reduce(
    (acc, suite) => {
      acc.total += suite.tests.length;
      acc.passed += suite.tests.filter((test) => test.status === "passed").length;
      acc.failed += suite.tests.filter((test) => test.status === "failed").length;
      acc.skipped += suite.tests.filter((test) => test.status === "skipped").length;
      acc.errors += suite.tests.filter((test) => test.status === "error").length;
      acc.duration += suite.duration;
      return acc;
    },
    { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, duration: 0 }
  );

  return {
    tool,
    framework,
    source,
    timestamp: timestamp ?? new Date().toISOString(),
    duration: totals.duration,
    total: totals.total,
    passed: totals.passed,
    failed: totals.failed,
    skipped: totals.skipped,
    errors: totals.errors,
  };
}
