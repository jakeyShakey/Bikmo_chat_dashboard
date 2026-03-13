const COLORS = {
  yes: "#4ade80",
  no: "#f87171",
  review: "#fbbf24",
};

export function StatusBadge({ status }) {
  const color = COLORS[status] ?? "#8a8f9e";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: color + "22", border: `1px solid ${color}44`,
      borderRadius: 20, padding: "2px 10px",
      color, fontSize: 11, fontFamily: "'DM Mono', monospace",
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {status ?? "—"}
    </span>
  );
}
