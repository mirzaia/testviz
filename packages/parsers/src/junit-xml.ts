import type { TestCase, TestRun, TestSuite } from "@testviz/core";

const STATUS = ["passed", "failed", "skipped", "error"] as const;

function statusFromCase(node: Element): TestCase["status"] {
  if (node.querySelector("failure")) return "failed";
  if (node.querySelector("error")) return "error";
  if (node.querySelector("skipped")) return "skipped";
  return "passed";
}

function parseNumber(value: string | null | undefined): number {
  const n = Number(value ?? "0");
  return Number.isFinite(n) ? n : 0;
}

function buildMetadata(doc: Document, suites: TestSuite[], source: string): TestRun["metadata"] {
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
    tool: "junit",
    framework: "JUnit",
    source,
    timestamp: new Date().toISOString(),
    duration: totals.duration,
    total: totals.total,
    passed: totals.passed,
    failed: totals.failed,
    skipped: totals.skipped,
    errors: totals.errors,
  };
}

export function parseJunitXml(xml: string, source = "local"): TestRun {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const suites = Array.from(doc.querySelectorAll("testsuite")).map((suiteNode) => {
    const tests = Array.from(suiteNode.querySelectorAll(":scope > testcase")).map((caseNode): TestCase => ({
      name: caseNode.getAttribute("name") ?? "Unnamed test",
      className: caseNode.getAttribute("classname") ?? "",
      status: statusFromCase(caseNode),
      duration: parseNumber(caseNode.getAttribute("time")) * 1000,
      errorMessage: caseNode.querySelector("failure, error")?.textContent?.trim() || undefined,
      stackTrace: caseNode.querySelector("failure, error")?.getAttribute("message") || undefined,
    }));
    const suiteDuration = parseNumber(suiteNode.getAttribute("time")) * 1000;
    const suiteStatus = tests.some((t) => t.status === "error")
      ? "error"
      : tests.some((t) => t.status === "failed")
        ? "failed"
        : tests.some((t) => t.status === "skipped")
          ? "skipped"
          : "passed";
    return {
      name: suiteNode.getAttribute("name") ?? "Unnamed suite",
      status: suiteStatus,
      duration: suiteDuration,
      timestamp: suiteNode.getAttribute("timestamp") ?? undefined,
      tests,
    } satisfies TestSuite;
  });

  return {
    metadata: buildMetadata(doc, suites, source),
    suites,
  };
}
