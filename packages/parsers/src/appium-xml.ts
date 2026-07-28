import { parseJunitXml } from "./junit-xml";

export function parseAppiumXml(xml: string, source = "local") {
  return {
    ...parseJunitXml(xml, source),
    metadata: {
      ...parseJunitXml(xml, source).metadata,
      tool: "appium",
      framework: "Appium",
    },
  };
}
