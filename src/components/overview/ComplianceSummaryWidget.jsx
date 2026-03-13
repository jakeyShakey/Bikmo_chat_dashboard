import { StatusBadge } from "../common/StatusBadge.jsx";
import { fmt } from "../../utils/formatters.js";

export function ComplianceSummaryWidget({ data }) {
  const breakdown = data?.complianceBreakdown ?? { yes: 0, no: 0, review: 0 };
  const recentFlags = data?.recentFlags ?? [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
        <p style={{ color: "#8a8f9e", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>Compliance Breakdown</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[["yes", breakdown.yes], ["no", breakdown.no], ["review", breakdown.review]].map(([status, count]) => (
            <div key={status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <StatusBadge status={status} />
              <span style={{ color: "#f0f2f7", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20 }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
        <p style={{ color: "#8a8f9e", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>Recent Flags</p>
        {recentFlags.length === 0 ? (
          <p style={{ color: "#555", fontSize: 13 }}>No flags in this period</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentFlags.map((f, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#c0c4d0", fontSize: 12 }}>{f.flag}</span>
                <span style={{ color: "#555", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{fmt(f.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
