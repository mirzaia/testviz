import { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "base" });

export function MermaidView({ diagram }: { diagram: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!ref.current) return;
      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      const { svg } = await mermaid.render(id, diagram);
      if (!cancelled && ref.current) ref.current.innerHTML = svg;
    }
    render().catch((error) => {
      if (ref.current) ref.current.textContent = String(error);
    });
    return () => {
      cancelled = true;
    };
  }, [diagram]);

  return <div ref={ref} className="mermaidCanvas" />;
}
