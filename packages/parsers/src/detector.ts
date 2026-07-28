import { parseJunitXml } from "./junit-xml";
import { parseSeleniumXml } from "./selenium-xml";
import { parseAppiumXml } from "./appium-xml";
import type { TestRun } from "@testviz/core";

export function detectAndParse(input: string, source = "local", filename = "upload.xml"): TestRun {
  const lowered = filename.toLowerCase();
  if (lowered.includes("selenium")) return parseSeleniumXml(input, source);
  if (lowered.includes("appium")) return parseAppiumXml(input, source);
  if (lowered.endsWith(".xml")) {
    const root = input.match(/<([a-zA-Z0-9:-]+)(\s|>)/)?.[1] ?? "";
    if (root.includes("testng")) return parseSeleniumXml(input, source);
    if (root.includes("run")) return parseAppiumXml(input, source);
    return parseJunitXml(input, source);
  }
  return parseJunitXml(input, source);
}
