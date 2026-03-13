import React, { useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge.jsx";
import { Pagination } from "../common/Pagination.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { fmtFull } from "../../utils/formatters.js";

const PAGE_SIZE = 20;

export function AuditTable({ audits }) {
  const [sortField, setSortField] = useState("audited_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const sorted = useMemo(() => {
    const rows = [...(audits ?? [])];
    rows.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === "audited_at") { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
      if (sortField === "confidence") { va = va ?? 0; vb = vb ?? 0; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [audits, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
    setPage(1);
  };

  const thStyle = (field) => ({
    color: sortField === field ? "#60a5fa" : "#8a8f9e",
    fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
    textTransform: "uppercase", cursor: "pointer", padding: "10px 16px",
    textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)",
    userSelect: "none",
  });

  if (!audits || audits.length === 0) return <EmptyState message="No audit records in the selected period" />;

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle("audited_at")} onClick={() => toggleSort("audited_at")}>Date {sortField === "audited_at" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th style={thStyle("status")} onClick={() => toggleSort("status")}>Status {sortField === "status" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th style={thStyle("confidence")} onClick={() => toggleSort("confidence")}>Confidence {sortField === "confidence" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th style={{ ...thStyle("flags"), cursor: "default" }}>Flags</th>
            <th style={{ ...thStyle("reasoning"), cursor: "default" }}>Reasoning</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => (
            <React.Fragment key={row.id}>
              <tr
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                style={{ cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "10px 16px", color: "#8a8f9e", fontSize: 12, fontFamily: "'DM Mono', monospace", borderBottom: "1px solid rgba(255,255,255,0.04)", whiteSpace: "nowrap" }}>
                  {fmtFull(row.audited_at)}
                </td>
                <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <StatusBadge status={row.status} />
                </td>
                <td style={{ padding: "10px 16px", color: "#c0c4d0", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {row.confidence != null ? `${Math.round(row.confidence * 100)}%` : "—"}
                </td>
                <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(row.flags ?? []).slice(0, 3).map((f, i) => (
                      <span key={i} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "1px 8px", color: "#f87171", fontSize: 10 }}>{f}</span>
                    ))}
                    {(row.flags ?? []).length > 3 && <span style={{ color: "#555", fontSize: 10 }}>+{row.flags.length - 3}</span>}
                  </div>
                </td>
                <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <ChevronRight size={14} color="#555" style={{ transform: expandedId === row.id ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                </td>
              </tr>
              {expandedId === row.id && (
                <tr>
                  <td colSpan={5} style={{ padding: "0 16px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 14, marginTop: 4 }}>
                      <p style={{ color: "#8a8f9e", fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Reasoning</p>
                      <p style={{ color: "#c0c4d0", fontSize: 13, margin: 0, lineHeight: 1.6 }}>{row.reasoning || "No reasoning provided"}</p>
                      {(row.flags ?? []).length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <p style={{ color: "#8a8f9e", fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>All Flags</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {row.flags.map((f, i) => (
                              <span key={i} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "2px 10px", color: "#f87171", fontSize: 11 }}>{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
    </div>
  );
}
