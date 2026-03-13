import { useState, useMemo } from "react";
import { ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge.jsx";
import { Pagination } from "../common/Pagination.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { fmtFull } from "../../utils/formatters.js";

const PAGE_SIZE = 25;

function estimateLines(text) {
  if (!text) return 0;
  return text.split("\n").filter(l => l.trim().length > 0).length;
}

export function ConversationTable({ rows }) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const totalPages = Math.max(1, Math.ceil((rows?.length ?? 0) / PAGE_SIZE));
  const pageRows = (rows ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!rows || rows.length === 0) return <EmptyState message="No conversations match your filters" />;

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
      {pageRows.map((row) => (
        <div key={row.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
            style={{ display: "flex", alignItems: "center", padding: "12px 16px", cursor: "pointer", gap: 12 }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <ChevronRight size={14} color="#555" style={{ transform: expandedId === row.id ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
            <span style={{ color: "#8a8f9e", fontSize: 11, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{fmtFull(row.created_at)}</span>
            <span style={{ color: "#c0c4d0", fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.messages_processed?.slice(0, 80) || "No transcript"}…
            </span>
            <span style={{ color: "#555", fontSize: 11, flexShrink: 0 }}>{estimateLines(row.messages_processed)} lines</span>
            {row.compliance_status ? <StatusBadge status={row.compliance_status} /> : <span style={{ color: "#444", fontSize: 10 }}>no audit</span>}
            {row.feedback === true ? <ThumbsUp size={14} color="#4ade80" /> :
             row.feedback === false ? <ThumbsDown size={14} color="#f87171" /> :
             <span style={{ color: "#444", fontSize: 10 }}>—</span>}
          </div>
          {expandedId === row.id && (
            <div style={{ padding: "0 16px 16px 40px" }}>
              <pre style={{ color: "#c0c4d0", fontSize: 12, fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 16, maxHeight: 300, overflowY: "auto", margin: 0 }}>
                {row.messages_processed || "No transcript available"}
              </pre>
            </div>
          )}
        </div>
      ))}
      <Pagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
    </div>
  );
}
