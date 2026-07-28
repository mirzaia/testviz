import { readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { Command } from "commander";
import { detectAndParse } from "@testviz/parsers";
import { generateCsv, generateMarkdownTable, generateFlowchart, generateGraph, generateMindmap } from "@testviz/generators";

const program = new Command();

program
  .name("testviz")
  .description("Parse test automation reports and render visualization outputs")
  .argument("<input>", "Path to the XML report")
  .option("-o, --output <file>", "Write output to a file instead of stdout")
  .option("-f, --format <format>", "Output format: mindmap, graph, flowchart, markdown, csv, json", "mindmap")
  .action((input, options) => {
    const filePath = resolve(process.cwd(), input);
    const xml = readFileSync(filePath, "utf8");
    const run = detectAndParse(xml, "local", input);

    const format = String(options.format ?? "mindmap").toLowerCase();
    const output = render(run, format);

    if (options.output) {
      writeFileSync(resolve(process.cwd(), options.output), output, "utf8");
      return;
    }

    process.stdout.write(`${output}\n`);
  });

program.parse(process.argv);

function render(run: ReturnType<typeof detectAndParse>, format: string): string {
  switch (format) {
    case "graph":
      return generateGraph(run);
    case "flowchart":
      return generateFlowchart(run);
    case "markdown":
      return generateMarkdownTable(run);
    case "csv":
      return generateCsv(run);
    case "json":
      return JSON.stringify(run, null, 2);
    case "mindmap":
    default:
      return generateMindmap(run);
  }
}
