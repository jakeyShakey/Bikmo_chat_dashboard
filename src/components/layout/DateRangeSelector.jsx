import { Calendar } from "lucide-react";
import { PRESETS } from "../../config.js";
import { useDashboard } from "../../context/DashboardContext.jsx";

export function DateRangeSelector() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, showCustom, setShowCustom } = useDashboard();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
      <Calendar size={14} color="#8a8f9e" />
      {PRESETS.map(p => {
        const active = preset === p.label && !showCustom;
        return (
          <button
            key={p.label}
            onClick={() => { setPreset(p.label); setShowCustom(false); }}
            style={{
              background: active ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${active ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 20, padding: "5px 14px",
              color: active ? "#60a5fa" : "#8a8f9e",
              fontSize: 12, cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        );
      })}
      <button
        onClick={() => setShowCustom(!showCustom)}
        style={{
          background: showCustom ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${showCustom ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 20, padding: "5px 14px",
          color: showCustom ? "#60a5fa" : "#8a8f9e",
          fontSize: 12, cursor: "pointer",
        }}
      >
        Custom range
      </button>
      {showCustom && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "4px 10px", color: "#c0c4d0", fontSize: 12, colorScheme: "dark" }}
          />
          <span style={{ color: "#555", fontSize: 12 }}>to</span>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "4px 10px", color: "#c0c4d0", fontSize: 12, colorScheme: "dark" }}
          />
        </div>
      )}
    </div>
  );
}
