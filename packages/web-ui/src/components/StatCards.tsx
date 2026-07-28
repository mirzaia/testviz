export function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <article className={`stat-card ${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
