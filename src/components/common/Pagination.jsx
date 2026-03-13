export function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ color: "#555", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
        {page} / {totalPages}
      </span>
      <button onClick={onPrev} disabled={page <= 1} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px", color: page <= 1 ? "#333" : "#8a8f9e", cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: 12 }}>
        ← Prev
      </button>
      <button onClick={onNext} disabled={page >= totalPages} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px", color: page >= totalPages ? "#333" : "#8a8f9e", cursor: page >= totalPages ? "not-allowed" : "pointer", fontSize: 12 }}>
        Next →
      </button>
    </div>
  );
}
