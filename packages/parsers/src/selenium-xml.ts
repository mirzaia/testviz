import { parseJunitXml } from "./junit-xml";

export function parseSeleniumXml(xml: string, source = "local") {
  return {
    ...parseJunitXml(xml, source),
    metadata: {
      ...parseJunitXml(xml, source).metadata,
      tool: "selenium",
      framework: "Selenium",
    },
  };
}
