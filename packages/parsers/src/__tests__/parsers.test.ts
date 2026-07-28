import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJunitXml } from "../junit-xml";
import { detectAndParse } from "../detector";
import { parseSeleniumXml } from "../selenium-xml";
import { parseAppiumXml } from "../appium-xml";

const fixturesDir = join(fileURLToPath(new URL(".", import.meta.url)), "fixtures");

function fixture(name: string) {
  return readFileSync(join(fixturesDir, name), "utf8");
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
});
