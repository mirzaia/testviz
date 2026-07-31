#!/usr/bin/env -S node --import tsx

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Command } from "commander";
import type { TestRun } from "@testviz/core";
import { detectAndParseAsync } from "@testviz/parsers";
import {
  generateCsv,
  generateFlowchart,
  generateGraph,
  generateIstqbDocx,
  generateMarkdownTable,
  generateMindmap,
  generatePptx,
} from "@testviz/generators";

const textFormats = ["mindmap", "graph", "flowchart", "markdown", "csv", "json"] as const;
type TextFormat = (typeof textFormats)[number];
type Format = TextFormat | "svg" | "png" | "pptx" | "docx";

const program = new Command();
program.name("testviz").description("Parse test automation reports and generate visual outputs").version("0.0.0");

program
  .command("parse <input>")
  .description("Parse a report and print its normalized TestViz JSON")
  .option("-o, --output <file>", "Write JSON to a file")
  .action(async (input, options) => {
    const output = JSON.stringify(await loadRun(input), null, 2);
    writeText(output, options.output);
  });

program
  .command("generate <input>")
  .description("Generate a visualization or report")
  .requiredOption("-f, --format <format>", "mindmap, graph, flowchart, markdown, csv, json, svg, png, pptx, or docx")
  .option("-o, --output <file>", "Write output to a file")
  .option("-d, --diagram <type>", "Diagram type for SVG/PNG: mindmap, graph, or flowchart", "mindmap")
  .action(async (input, options) => {
    const run = await loadRun(input);
    const format = normalizeFormat(options.format);
    const outputPath = options.output ? resolve(process.cwd(), options.output) : defaultOutput(input, format);

    if (format === "pptx") {
      await generatePptx(run).writeFile({ fileName: outputPath });
      return;
    }
    if (format === "docx") {
      writeFileSync(outputPath, await generateIstqbDocx(run));
      return;
    }
    if (format === "svg" || format === "png") {
      renderMermaid(run, normalizeDiagram(options.diagram), format, outputPath);
      return;
    }

    const output = renderText(run, format);
    if (options.output) writeText(output, outputPath);
    else process.stdout.write(`${output}\n`);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

async function loadRun(input: string): Promise<TestRun> {
  const path = resolve(process.cwd(), input);
  const lowered = input.toLowerCase();
  if (lowered.endsWith(".zip")) {
    return detectAndParseAsync(readFileSync(path), "local", input);
  }
  return detectAndParseAsync(readFileSync(path, "utf8"), "local", input);
}

function writeText(output: string, path?: string) {
  if (path) writeFileSync(resolve(process.cwd(), path), output, "utf8");
  else process.stdout.write(`${output}\n`);
}

function renderText(run: TestRun, format: TextFormat): string {
  switch (format) {
    case "graph": return generateGraph(run);
    case "flowchart": return generateFlowchart(run);
    case "markdown": return generateMarkdownTable(run);
    case "csv": return generateCsv(run);
    case "json": return JSON.stringify(run, null, 2);
    default: return generateMindmap(run);
  }
}

function normalizeFormat(value: string): Format {
  const format = value.toLowerCase() as Format;
  if ([...textFormats, "svg", "png", "pptx", "docx"].includes(format)) return format;
  throw new Error(`Unsupported format: ${value}`);
}

function normalizeDiagram(value: string): Exclude<TextFormat, "markdown" | "csv" | "json"> {
  if (["mindmap", "graph", "flowchart"].includes(value)) return value as "mindmap" | "graph" | "flowchart";
  throw new Error(`Unsupported diagram type: ${value}`);
}

function renderMermaid(run: TestRun, diagram: "mindmap" | "graph" | "flowchart", format: "svg" | "png", outputPath: string) {
  const directory = mkdtempSync(join(tmpdir(), "testviz-"));
  const inputPath = join(directory, "diagram.mmd");
  try {
    writeFileSync(inputPath, renderText(run, diagram), "utf8");
    const result = spawnSync("npx", ["--no-install", "mmdc", "-i", inputPath, "-o", outputPath, "-e", format], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || "Mermaid CLI could not render the diagram");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function defaultOutput(input: string, format: Format): string {
  return resolve(process.cwd(), `${basename(input, extname(input))}.${format === "mindmap" ? "mmd" : format}`);
}
