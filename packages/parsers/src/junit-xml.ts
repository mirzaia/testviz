import type { TestCase, TestRun, TestSuite } from "@testviz/core";

type Attrs = Record<string, string>;

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseAttrs(source: string): Attrs {
  const attrs: Attrs = {};
  const pattern = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    attrs[match[1]] = decodeXml(match[2]);
  }
  return attrs;
}

function parseNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function statusFromTest(attrs: Attrs, inner: string): TestCase["status"] {
  const status = (attrs.status ?? attrs.result ?? attrs.outcome ?? "").toLowerCase();
  if (["failed", "failure", "fail"].includes(status) || /<(failure|failed)\b/i.test(inner)) return "failed";
  if (["error", "errored"].includes(status) || /<error\b/i.test(inner)) return "error";
  if (["skipped", "skip", "ignored"].includes(status) || /<(skipped|ignored)\b/i.test(inner)) return "skipped";
  return "passed";
}

function statusFromSuite(tests: TestCase[], attrs: Attrs): TestSuite["status"] {
  const status = (attrs.status ?? attrs.result ?? "").toLowerCase();
  if (["failed", "failure", "fail"].includes(status)) return "failed";
  if (["error", "errored"].includes(status)) return "error";
  if (["skipped", "skip"].includes(status)) return "skipped";
  if (tests.some((test) => test.status === "error")) return "error";
  if (tests.some((test) => test.status === "failed")) return "failed";
  if (tests.some((test) => test.status === "skipped")) return "skipped";
  return "passed";
}

function parseTestCase(block: string): TestCase {
  const opening = block.match(/^<testcase\b([^>]*)>/i);
  const attrs = parseAttrs(opening?.[1] ?? "");
  const body = block.replace(/^<testcase\b[^>]*>/i, "").replace(/<\/testcase>\s*$/i, "");
  const failure = body.match(/<(failure|error)\b([^>]*)>([\s\S]*?)<\/\1>/i);
  const skipped = body.match(/<(skipped|ignored)\b([^>]*)>([\s\S]*?)<\/\1>/i);
  const detail = failure ?? skipped;

  return {
    name: attrs.name ?? "Unnamed test",
    className: attrs.classname ?? attrs.className ?? "",
    status: statusFromTest(attrs, body),
    duration: parseNumber(attrs.time) * 1000,
    errorMessage: detail ? decodeXml(detail[3].trim()) || undefined : undefined,
    stackTrace: detail ? parseAttrs(detail[2]).message ?? undefined : undefined,
  };
}

function parseTestCases(body: string): TestCase[] {
  const cases: TestCase[] = [];
  const pattern = /<testcase\b[^>]*\/>|<testcase\b[\s\S]*?<\/testcase>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body))) {
    cases.push(parseTestCase(match[0]));
  }
  return cases;
}

function extractSuites(xml: string): { attrs: Attrs; body: string }[] {
  const suites: { attrs: Attrs; body: string }[] = [];
  const pattern = /<testsuite\b([^>]*)>([\s\S]*?)<\/testsuite>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml))) {
    suites.push({ attrs: parseAttrs(match[1] ?? ""), body: match[2] ?? "" });
  }
  return suites;
}

function buildMetadata(suites: TestSuite[], source: string, tool: string, framework: string): TestRun["metadata"] {
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
    timestamp: new Date().toISOString(),
    duration: totals.duration,
    total: totals.total,
    passed: totals.passed,
    failed: totals.failed,
    skipped: totals.skipped,
    errors: totals.errors,
  };
}

function parseSuites(xml: string): TestSuite[] {
  const suites = extractSuites(xml);
  if (suites.length) {
    return suites.map(({ attrs, body }) => {
      const tests = parseTestCases(body);
      return {
        name: attrs.name ?? "Unnamed suite",
        status: statusFromSuite(tests, attrs),
        duration: parseNumber(attrs.time ?? attrs.duration) * 1000,
        timestamp: attrs.timestamp ?? attrs.timeStamp ?? undefined,
        tests,
      } satisfies TestSuite;
    });
  }

  const rootTests = parseTestCases(xml);
  if (!rootTests.length) return [];
  return [
    {
      name: "Default Suite",
      status: statusFromSuite(rootTests, {}),
      duration: rootTests.reduce((total, test) => total + test.duration, 0),
      tests: rootTests,
    },
  ];
}

export function parseJunitXml(xml: string, source = "local"): TestRun {
  const suites = parseSuites(xml.replace(/<\?xml[\s\S]*?\?>/g, "").trim());
  return {
    metadata: buildMetadata(suites, source, "junit", "JUnit"),
    suites,
  };
}
