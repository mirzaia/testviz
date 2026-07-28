export function ExportPanel({ mermaid, markdown, csv, json }: { mermaid: string; markdown: string; csv: string; json: string }) {
  return (
    <section className="export-panel">
      <div className="panel-heading">
        <h3>Export</h3>
        <p>Download the current visualization and source data.</p>
      </div>
      <div className="export-actions">
        <a download="testviz.mmd" href={downloadHref(mermaid, "text/plain")}>Mermaid</a>
        <a download="testviz.md" href={downloadHref(markdown, "text/markdown")}>Markdown</a>
        <a download="testviz.csv" href={downloadHref(csv, "text/csv")}>CSV</a>
        <a download="testviz.json" href={downloadHref(json, "application/json")}>JSON</a>
      </div>
    </section>
  );
}

function downloadHref(content: string, type: string) {
  return `data:${type};charset=utf-8,${encodeURIComponent(content)}`;
}
