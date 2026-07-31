import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { parseJunitXml } from "../junit-xml";
import { detectAndParse, detectAndParseAsync } from "../detector";
import { parseSeleniumXml } from "../selenium-xml";
import { parseAppiumXml } from "../appium-xml";
import { parseAllureZip } from "../allure-zip";
import { parseIntellijLog } from "../intellij-log";
import { parseAppiumLog } from "../appium-log";

const fixturesDir = join(fileURLToPath(new URL(".", import.meta.url)), "fixtures");

function fixture(name: string) {
  return readFileSync(join(fixturesDir, name), "utf8");
}

async function buildAllureZipFixture(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "allure-report/allureReport/data/suites.json",
    JSON.stringify({
      uid: "root",
      name: "suites",
      children: [
        {
          name: " TEST, QA_ENV: qa-sg, TAGS: ",
          children: [
            {
              name: "Login Suite",
              children: [
                {
                  uid: "case-pass",
                  name: "shouldLogin",
                  status: "passed",
                  time: { start: 1, stop: 51, duration: 50 },
                },
                {
                  uid: "case-fail",
                  name: "shouldRejectInvalidUser",
                  status: "failed",
                  time: { start: 51, stop: 121, duration: 70 },
                },
                {
                  uid: "case-broken",
                  name: "shouldHandleBroken",
                  status: "broken",
                  time: { start: 121, stop: 221, duration: 100 },
                },
              ],
            },
          ],
        },
      ],
    })
  );
  zip.file(
    "allure-report/allureReport/data/test-cases/case-pass.json",
    JSON.stringify({
      uid: "case-pass",
      name: "shouldLogin",
      fullName: "com.example.LoginTest.shouldLogin",
      status: "passed",
      time: { duration: 50 },
      testStage: { steps: [{ name: "open app", status: "passed", time: { duration: 10 } }] },
    })
  );
  zip.file(
    "allure-report/allureReport/data/test-cases/case-fail.json",
    JSON.stringify({
      uid: "case-fail",
      name: "shouldRejectInvalidUser",
      fullName: "com.example.LoginTest.shouldRejectInvalidUser",
      status: "failed",
      statusMessage: "Assertion failed",
      statusTrace: "Expected error message",
      time: { duration: 70 },
      testStage: {
        steps: [
          { name: "enter credentials", status: "passed", time: { duration: 20 } },
          { name: "assert error", status: "failed", time: { duration: 5 } },
        ],
      },
    })
  );
  zip.file(
    "allure-report/allureReport/data/test-cases/case-broken.json",
    JSON.stringify({
      uid: "case-broken",
      name: "shouldHandleBroken",
      status: "broken",
      statusMessage: "Unhandled exception",
      time: { duration: 100 },
    })
  );
  // macOS junk that must be ignored
  zip.file("__MACOSX/allure-report/._data", "junk");
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("parsers", () => {
  it("parses standard junit xml with failures and skips", () => {
    const run = parseJunitXml(fixture("junit-basic.xml"));
    expect(run.metadata.total).toBe(3);
    expect(run.metadata.passed).toBe(1);
    expect(run.metadata.failed).toBe(1);
    expect(run.metadata.skipped).toBe(1);
    expect(run.suites[0].status).toBe("failed");
    expect(run.suites[0].tests[1].errorMessage).toContain("Expected error message");
  });

  it("detects surefire xml by filename", () => {
    const run = detectAndParse(fixture("surefire-report.xml"), "local", "surefire-report.xml");
    expect(run.metadata.tool).toBe("junit");
    expect(run.suites[0].name).toBe("Surefire Suite");
    expect(run.suites[0].tests[1].status).toBe("error");
  });

  it("parses selenium testng output through the selenium adapter", () => {
    const run = parseSeleniumXml(fixture("testng-results.xml"));
    expect(run.metadata.tool).toBe("selenium");
    expect(run.metadata.framework).toBe("Selenium");
    expect(run.suites[0].name).toBe("MobileSuite");
    expect(run.suites[0].tests[0].name).toBe("shouldLaunchApp");
  });

  it("parses appium runs and keeps junit structure", () => {
    const run = parseAppiumXml(fixture("appium-test-run.xml"));
    expect(run.metadata.tool).toBe("appium");
    expect(run.suites[0].name).toBe("Appium Suite");
  });

  it("detects appium by root tag", () => {
    const run = detectAndParse(fixture("appium-test-run.xml"), "local", "report.xml");
    expect(run.metadata.tool).toBe("appium");
  });

  it("parses nested Allure ZIP reports (company layout) into suites and steps", async () => {
    const buffer = await buildAllureZipFixture();
    const run = await parseAllureZip(buffer);
    expect(run.metadata.tool).toBe("allure");
    expect(run.metadata.total).toBe(3);
    expect(run.metadata.passed).toBe(1);
    expect(run.metadata.failed).toBe(1);
    expect(run.metadata.errors).toBe(1);
    expect(run.suites[0].name).toBe("Login Suite");
    const failed = run.suites[0].tests.find((test) => test.name === "shouldRejectInvalidUser");
    expect(failed?.status).toBe("failed");
    expect(failed?.errorMessage).toBe("Assertion failed");
    expect(failed?.steps?.length).toBe(2);
    const broken = run.suites[0].tests.find((test) => test.name === "shouldHandleBroken");
    expect(broken?.status).toBe("error");
  });

  it("detects Allure ZIP via detectAndParseAsync", async () => {
    const buffer = await buildAllureZipFixture();
    const run = await detectAndParseAsync(buffer, "local", "allure-report.zip");
    expect(run.metadata.tool).toBe("allure");
  });

  it("parses IntelliJ NvTestRunner / Cucumber logs", () => {
    const run = parseIntellijLog(fixture("intellij-run.txt"));
    expect(run.metadata.tool).toBe("intellij");
    expect(run.metadata.framework).toContain("Cucumber");
    expect(run.metadata.total).toBe(1);
    expect(run.metadata.failed).toBe(1);
    expect(run.suites[0].tests[0].name).toContain("Example Order Flow");
    expect(run.suites[0].tests[0].errorMessage).toContain("create order");
    expect(run.metadata.duration).toBeGreaterThan(0);
  });

  it("detects IntelliJ logs by filename and content", () => {
    const run = detectAndParse(fixture("intellij-run.txt"), "local", "intellij-run.txt");
    expect(run.metadata.tool).toBe("intellij");
  });

  it("parses Appium 2 session text logs with HTTP steps", () => {
    const run = parseAppiumLog(fixture("appium-session.txt"));
    expect(run.metadata.tool).toBe("appium-log");
    expect(run.metadata.total).toBe(1);
    expect(run.suites[0].name).toContain("DEVICE001");
    expect(run.suites[0].tests[0].steps?.length).toBeGreaterThan(0);
    expect(run.suites[0].tests[0].errorMessage).toMatch(/NoSuchElementError/);
  });

  it("detects Appium text logs by content", () => {
    const run = detectAndParse(fixture("appium-session.txt"), "local", "session.txt");
    expect(run.metadata.tool).toBe("appium-log");
  });
});
