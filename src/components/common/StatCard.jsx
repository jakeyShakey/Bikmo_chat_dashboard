export function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: "#8a8f9e", fontSize: 12, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>{label}</p>
          <p style={{ color: "#f0f2f7", fontSize: 32, fontWeight: 700, margin: "6px 0 4px", fontFamily: "'Syne', sans-serif" }}>{value}</p>
          {sub && <p style={{ color: "#8a8f9e", fontSize: 12, margin: 0 }}>{sub}</p>}
        </div>
        <div style={{ background: accent + "22", borderRadius: 8, padding: 10 }}>
          <Icon size={18} color={accent} />
        </div>
      </div>
    </div>
  );
}
