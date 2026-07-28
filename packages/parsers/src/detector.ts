import { parseJunitXml } from "./junit-xml";
import { parseSeleniumXml } from "./selenium-xml";
import { parseAppiumXml } from "./appium-xml";
import type { TestRun } from "@testviz/core";

export function detectAndParse(input: string, source = "local", filename = "upload.xml"): TestRun {
  const lowered = filename.toLowerCase();
  const root = input.match(/<([a-zA-Z0-9:-]+)(\s|>)/)?.[1]?.toLowerCase() ?? "";
  if (lowered.includes("selenium")) return parseSeleniumXml(input, source);
  if (lowered.includes("appium")) return parseAppiumXml(input, source);
  if (/^test-.*\.xml$/.test(lowered) || lowered === "surefire-report.xml" || lowered.endsWith("-test-results.xml")) {
    return parseJunitXml(input, source);
  }
  if (lowered.endsWith(".xml")) {
    if (root.includes("testng") || root === "testng-results") return parseSeleniumXml(input, source);
    if (root.includes("appium") || root.includes("test-run")) return parseAppiumXml(input, source);
    return parseJunitXml(input, source);
  }
  if (root.includes("testng") || root === "testng-results") return parseSeleniumXml(input, source);
  if (root.includes("appium") || root.includes("test-run")) return parseAppiumXml(input, source);
  return parseJunitXml(input, source);
}
