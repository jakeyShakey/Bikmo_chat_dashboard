export function ChartCard({ title, children }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
      <p style={{ color: "#8a8f9e", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>{title}</p>
      {children}
    </div>
  );
}
