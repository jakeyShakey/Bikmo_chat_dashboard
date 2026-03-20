import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Pagination } from "../common/Pagination.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { fmtFull } from "../../utils/formatters.js";

const PAGE_SIZE = 25;

export function EscalationTable({ rows }) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const totalPages = Math.max(1, Math.ceil((rows?.length ?? 0) / PAGE_SIZE));
  const pageRows = (rows ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!rows || rows.length === 0) return <EmptyState message="No escalations in the selected period" />;

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
            <span style={{ color: "#8a8f9e", fontSize: 11, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
              {fmtFull(row.escalated_at)}
            </span>
            <span style={{ color: "#f97316", fontSize: 11, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
              #{row.zendesk_ticket_id}
            </span>
            <span style={{ color: "#c0c4d0", fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.customer_name || "—"}
            </span>
            {row.message_count_at_escalation != null && (
              <span style={{ color: "#8a8f9e", fontSize: 11, flexShrink: 0 }}>
                {row.message_count_at_escalation} msgs
              </span>
            )}
            <span style={{ color: "#555", fontSize: 11, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
              {row.conversation_id ? row.conversation_id.slice(0, 12) + "…" : "—"}
            </span>
          </div>
          {expandedId === row.id && (
            <div style={{ padding: "0 16px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
              {row.customer_email && (
                <div style={{ color: "#8a8f9e", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                  {row.customer_email}
                </div>
              )}
              {row.issue_description && (
                <div>
                  <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Issue Description</div>
                  <p style={{ color: "#c0c4d0", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{row.issue_description}</p>
                </div>
              )}
              {row.previous_messages && (
                <div>
                  <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Previous Messages</div>
                  <pre style={{ color: "#c0c4d0", fontSize: 12, fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 16, maxHeight: 300, overflowY: "auto", margin: 0 }}>
                    {row.previous_messages}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <Pagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
    </div>
  );
}
