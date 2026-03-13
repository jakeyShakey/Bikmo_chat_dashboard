import { Search } from "lucide-react";

const filterBtn = (active) => ({
  background: active ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.04)",
  border: `1px solid ${active ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}`,
  borderRadius: 20, padding: "5px 14px",
  color: active ? "#60a5fa" : "#8a8f9e",
  fontSize: 12, cursor: "pointer",
});

export function ConversationFilters({ search, onSearch, compliance, onCompliance, feedback, onFeedback, total }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ position: "relative", flex: "0 0 280px" }}>
          <Search size={13} color="#555" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search transcripts…"
            value={search}
            onChange={e => onSearch(e.target.value)}
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 10px 7px 30px", color: "#c0c4d0", fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <span style={{ marginLeft: "auto", color: "#555", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{total} conversations</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: "#555", fontSize: 11, alignSelf: "center", fontFamily: "'DM Mono', monospace" }}>Compliance:</span>
        {[["all", "All"], ["yes", "Compliant"], ["no", "Non-compliant"], ["review", "Review"], ["none", "Not audited"]].map(([val, label]) => (
          <button key={val} onClick={() => onCompliance(val)} style={filterBtn(compliance === val)}>{label}</button>
        ))}
        <span style={{ color: "#555", fontSize: 11, alignSelf: "center", marginLeft: 8, fontFamily: "'DM Mono', monospace" }}>Feedback:</span>
        {[["all", "All"], ["positive", "👍"], ["negative", "👎"], ["none", "No feedback"]].map(([val, label]) => (
          <button key={val} onClick={() => onFeedback(val)} style={filterBtn(feedback === val)}>{label}</button>
        ))}
      </div>
    </div>
  );
}
