import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { TestRun } from "@testviz/core";

const statusLabel = (status: string) => status.toUpperCase();

/** Generates an ISTQB-oriented test execution report as a DOCX buffer. */
export async function generateIstqbDocx(run: TestRun): Promise<Buffer> {
  const document = new Document({
    sections: [{
      children: [
        new Paragraph({ text: "Test Execution Report", heading: HeadingLevel.TITLE }),
        new Paragraph({ children: [new TextRun({ text: "1. Test Item and Environment", bold: true })] }),
        new Paragraph(`Tool: ${run.metadata.tool}`),
        new Paragraph(`Framework: ${run.metadata.framework}`),
        new Paragraph(`Source: ${run.metadata.source}`),
        new Paragraph(`Execution timestamp: ${run.metadata.timestamp}`),
        new Paragraph({ children: [new TextRun({ text: "2. Execution Summary", bold: true })] }),
        summaryTable(run),
        new Paragraph({ children: [new TextRun({ text: "3. Detailed Results", bold: true })] }),
        ...run.suites.flatMap((suite) => [
          new Paragraph({ text: `${suite.name} (${statusLabel(suite.status)})`, heading: HeadingLevel.HEADING_2 }),
          resultTable(suite.tests.map((test) => [test.name, test.className, statusLabel(test.status), `${Math.round(test.duration)}`, test.errorMessage ?? test.stackTrace ?? ""])),
        ]),
        new Paragraph({ children: [new TextRun({ text: "4. Exit Criteria Assessment", bold: true })] }),
        new Paragraph(`Executed: ${run.metadata.total}; passed: ${run.metadata.passed}; failed: ${run.metadata.failed}; errors: ${run.metadata.errors}; skipped: ${run.metadata.skipped}.`),
      ],
    }],
  });
  return Packer.toBuffer(document);
}

function summaryTable(run: TestRun): Table {
  return resultTable([
    ["Total", String(run.metadata.total)], ["Passed", String(run.metadata.passed)], ["Failed", String(run.metadata.failed)],
    ["Skipped", String(run.metadata.skipped)], ["Errors", String(run.metadata.errors)], ["Duration (ms)", String(Math.round(run.metadata.duration))],
  ]);
}

function resultTable(rows: string[][]): Table {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rows.map((row) => new TableRow({ children: row.map((value) => new TableCell({ children: [new Paragraph(value)] })) })) });
}
