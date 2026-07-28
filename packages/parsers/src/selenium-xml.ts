import type { TestCase, TestRun, TestSuite } from "@testviz/core";
import { parseJunitXml } from "./junit-xml";

function parseNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function statusFromMethod(value: string | undefined): TestCase["status"] {
  const status = (value ?? "").toLowerCase();
  if (["fail", "failed", "failure"].includes(status)) return "failed";
  if (["skip", "skipped"].includes(status)) return "skipped";
  if (["error", "errored"].includes(status)) return "error";
  return "passed";
}

function buildMetadata(suites: TestSuite[], source: string): TestRun["metadata"] {
  const base = parseJunitXml("<testsuite name=\"empty\" tests=\"0\"/>", source).metadata;
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
    ...base,
    tool: "selenium",
    framework: "Selenium",
    source,
    duration: totals.duration,
    total: totals.total,
    passed: totals.passed,
    failed: totals.failed,
    skipped: totals.skipped,
    errors: totals.errors,
  };
}

function parseTestNg(xml: string): TestSuite[] {
  const suitePattern = /<testng-results[\s\S]*?>[\s\S]*?<suite\b([^>]*)>([\s\S]*?)<\/suite>[\s\S]*?<\/testng-results>/i;
  const suiteMatch = xml.match(suitePattern);
  if (!suiteMatch) return [];

  const suiteAttrs = Object.fromEntries(
    [...suiteMatch[1].matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g)].map(([_, key, value]) => [key, value])
  );
  const classPattern = /<class\b([^>]*)>([\s\S]*?)<\/class>/gi;
  const tests: TestCase[] = [];
  let classMatch: RegExpExecArray | null;
  while ((classMatch = classPattern.exec(suiteMatch[2]))) {
    const classAttrs = Object.fromEntries(
      [...classMatch[1].matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g)].map(([_, key, value]) => [key, value])
    );
    const methodPattern = /<test-method\b([^>]*)\/>/gi;
    let methodMatch: RegExpExecArray | null;
    while ((methodMatch = methodPattern.exec(classMatch[2]))) {
      const attrs = Object.fromEntries(
        [...methodMatch[1].matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g)].map(([_, key, value]) => [key, value])
      );
      tests.push({
        name: attrs.name ?? "Unnamed method",
        className: classAttrs.name ?? "",
        status: statusFromMethod(attrs.status),
        duration: parseNumber(attrs["duration-ms"]),
      });
    }
  }

  return [
    {
      name: suiteAttrs.name ?? "Selenium Suite",
      status: tests.some((test) => test.status === "error")
        ? "error"
        : tests.some((test) => test.status === "failed")
          ? "failed"
          : tests.some((test) => test.status === "skipped")
            ? "skipped"
            : "passed",
      duration: tests.reduce((total, test) => total + test.duration, 0),
      tests,
    },
  ];
}

export function parseSeleniumXml(xml: string, source = "local"): TestRun {
  const suites = parseTestNg(xml);
  if (!suites.length) {
    const junit = parseJunitXml(xml, source);
    return {
      ...junit,
      metadata: {
        ...junit.metadata,
        tool: "selenium",
        framework: "Selenium",
      },
    };
  }

  return {
    metadata: buildMetadata(suites, source),
    suites,
  };
}
