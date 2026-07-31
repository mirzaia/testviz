import type { TestCase, TestRun, TestStep, TestSuite } from "@testviz/core";
import { buildMetadata, suiteStatusFromTests } from "./metadata";

/**
 * Appium 2 server logs (company mobile runs):
 * - Session create with udid / appActivity
 * - HTTP command stream: --> POST /wd/hub/session/.../element
 * - No Cucumber-style TEST PASSED markers in the Appium log itself
 */
export function parseAppiumLog(text: string, source = "local"): TestRun {
  const sessionMatch =
    text.match(/Session created with session id:\s*([a-f0-9-]{8,})/i) ??
    text.match(/session\s+([a-f0-9-]{8,})\s+added to master session list/i);
  const udid = text.match(/"appium:udid"\s*:\s*"([^"]+)"/i)?.[1] ?? text.match(/\budid["']?\s*[:=]\s*["']?([A-Za-z0-9-]+)/i)?.[1];
  const platform = text.match(/"platformName"\s*:\s*"([^"]+)"/i)?.[1] ?? text.match(/creating new (\w+) session/i)?.[1];
  const app = text.match(/"appium:app"\s*:\s*"([^"]+)"/i)?.[1];
  const activity = text.match(/"appium:appActivity"\s*:\s*"([^"]+)"/i)?.[1] ?? text.match(/appActivity["']?\s*[:=]\s*["']?([^"',\s]+)/i)?.[1];

  const suiteName = udid ? `Appium (${udid})` : "Appium Session";
  const steps: TestStep[] = [];
  let httpOk = 0;
  let httpFail = 0;

  const httpLine =
    /(?:\[HTTP\]\s*)?(-->|<--)\s+(GET|POST|DELETE|PUT|PATCH)\s+(\S+)(?:\s+(\d{3}))?(?:\s+(\d+)\s*ms)?/gi;
  let match: RegExpExecArray | null;
  while ((match = httpLine.exec(text))) {
    const direction = match[1];
    const method = match[2];
    const path = match[3].replace(/\?.*$/, "");
    const statusCode = match[4] ? Number(match[4]) : undefined;
    const duration = match[5] ? Number(match[5]) : 0;
    // Prefer response lines for status; keep request lines when no status yet
    if (direction === "-->" && statusCode == null) continue;
    const failed = statusCode != null && statusCode >= 400;
    if (failed) httpFail += 1;
    else if (statusCode != null) httpOk += 1;
    const shortPath = path.length > 80 ? `${path.slice(0, 77)}...` : path;
    steps.push({
      name: `${method} ${shortPath}${statusCode != null ? ` → ${statusCode}` : ""}`,
      status: failed ? "failed" : "passed",
      duration,
    });
  }

  // Cap step volume for visualization — keep first createSession + a sample of later calls + failures
  const capped = capSteps(steps, 40);

  const noSuch = (text.match(/NoSuchElementError/g) ?? []).length;
  const sessionFailed =
    /Could not (?:proxy|start)|ECONNREFUSED|session.*(crash|deleted unexpectedly)|An unknown server-side error/i.test(text) &&
    httpOk === 0;

  const status: TestCase["status"] =
    sessionFailed ? "failed" : httpFail > 0 && httpOk === 0 ? "failed" : sessionMatch ? "passed" : "error";

  const test: TestCase = {
    name: sessionMatch ? `session ${sessionMatch[1].slice(0, 8)}` : "appium-session",
    className: [platform, activity].filter(Boolean).join(" / ") || suiteName,
    status,
    duration: capped.reduce((total, step) => total + step.duration, 0),
    errorMessage:
      noSuch > 0
        ? `${noSuch} NoSuchElementError response(s) in session log`
        : sessionFailed
          ? "Appium session reported fatal errors"
          : undefined,
    steps: capped.length ? capped : undefined,
  };

  // Attach app path as a synthetic passed step when present
  if (app && test.steps) {
    test.steps.unshift({
      name: `app: ${app.split(/[/\\]/).pop() ?? app}`,
      status: "passed",
      duration: 0,
    });
  }

  const suites: TestSuite[] = [
    {
      name: suiteName,
      status: suiteStatusFromTests([test]),
      duration: test.duration,
      tests: [test],
    },
  ];

  return {
    metadata: buildMetadata(suites, source, "appium-log", "Appium"),
    suites,
  };
}

function capSteps(steps: TestStep[], limit: number): TestStep[] {
  if (steps.length <= limit) return steps;
  const failures = steps.filter((step) => step.status === "failed");
  const ok = steps.filter((step) => step.status !== "failed");
  const head = ok.slice(0, Math.max(5, limit - failures.length - 5));
  const tail = ok.slice(-(Math.max(0, limit - head.length - failures.length)));
  const merged = [...head, ...failures.slice(0, Math.max(0, limit - head.length - tail.length)), ...tail];
  // de-dupe while preserving order
  const seen = new Set<string>();
  return merged.filter((step) => {
    const key = `${step.name}:${step.status}:${step.duration}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function looksLikeAppiumLog(text: string): boolean {
  return (
    /\[Appium(?:Driver@[^\]]+)?\]/i.test(text) ||
    /Welcome to Appium/i.test(text) ||
    /Appium REST http interface listener/i.test(text) ||
    /AndroidUiautomator2Driver@/i.test(text) ||
    /\/wd\/hub\/session/i.test(text) ||
    (/Session created with session id:/i.test(text) && /\budid\b/i.test(text))
  );
}
