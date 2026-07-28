import { parseJunitXml } from "./junit-xml";
import type { TestRun } from "@testviz/core";

export function parseAppiumXml(xml: string, source = "local"): TestRun {
  const run = parseJunitXml(xml, source);
  return {
    ...run,
    metadata: {
      ...run.metadata,
      tool: "appium",
      framework: "Appium",
    },
  };
}
