import type { TestRun } from "@testviz/core";
import { parseJunitXml } from "./junit-xml";
import { parseSeleniumXml } from "./selenium-xml";
import { parseAppiumXml } from "./appium-xml";
import { parseAllureZip } from "./allure-zip";
import { looksLikeIntellijLog, parseIntellijLog } from "./intellij-log";
import { looksLikeAppiumLog, parseAppiumLog } from "./appium-log";

function parseXml(input: string, source: string, filename: string): TestRun {
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

function parseTextLog(input: string, source: string, filename: string): TestRun {
  const lowered = filename.toLowerCase();
  if (lowered.includes("intellij") || lowered.includes("idea")) return parseIntellijLog(input, source);
  if (lowered.includes("appium")) return parseAppiumLog(input, source);

  if (looksLikeAppiumLog(input)) return parseAppiumLog(input, source);
  if (looksLikeIntellijLog(input)) return parseIntellijLog(input, source);

  return parseIntellijLog(input, source);
}

function isBinaryInput(input: string | ArrayBuffer | Uint8Array | Buffer): input is ArrayBuffer | Uint8Array | Buffer {
  return typeof input !== "string";
}

/**
 * Synchronous detector for string inputs (XML and text logs).
 * For ZIP / Allure archives use {@link detectAndParseAsync}.
 */
export function detectAndParse(input: string, source = "local", filename = "upload.xml"): TestRun {
  const lowered = filename.toLowerCase();
  if (lowered.endsWith(".zip")) {
    throw new Error("ZIP / Allure reports require detectAndParseAsync (binary input)");
  }
  if (lowered.endsWith(".txt") || lowered.endsWith(".log") || (!lowered.endsWith(".xml") && !input.trimStart().startsWith("<"))) {
    if (input.trimStart().startsWith("<")) return parseXml(input, source, filename);
    return parseTextLog(input, source, filename);
  }
  return parseXml(input, source, filename);
}

/**
 * Async detector that also accepts Allure ZIP archives (ArrayBuffer / Uint8Array / Buffer).
 */
export async function detectAndParseAsync(
  input: string | ArrayBuffer | Uint8Array | Buffer,
  source = "local",
  filename = "upload.xml"
): Promise<TestRun> {
  const lowered = filename.toLowerCase();
  if (lowered.endsWith(".zip") || (isBinaryInput(input) && !lowered.endsWith(".xml") && !lowered.endsWith(".txt") && !lowered.endsWith(".log"))) {
    if (!isBinaryInput(input)) {
      throw new Error("Allure ZIP parsing requires binary input (ArrayBuffer / Uint8Array / Buffer)");
    }
    return parseAllureZip(input, source);
  }
  if (isBinaryInput(input)) {
    const text = new TextDecoder().decode(input instanceof ArrayBuffer ? new Uint8Array(input) : input);
    return detectAndParse(text, source, filename);
  }
  return detectAndParse(input, source, filename);
}
