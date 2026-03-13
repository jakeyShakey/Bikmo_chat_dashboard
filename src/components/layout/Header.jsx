import { RefreshCw } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext.jsx";

export function Header() {
  const { lastUpdated, refresh, refreshToken } = useDashboard();
  // We need to know if loading — but Header doesn't have loading state.
  // Use a simple approach: track if refresh was recently triggered via refreshToken.
  // Actually, just show the refresh button without loading spinner since header doesn't own loading.

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>Bikmo</span>
        <span style={{ color: "#444", fontSize: 14 }}>/</span>
        <span style={{ color: "#8a8f9e", fontSize: 14 }}>Chatbot Analytics</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {lastUpdated && (
          <span style={{ color: "#555", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
            Updated {lastUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <button
          onClick={refresh}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", color: "#c0c4d0", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>
    </div>
  );
}
