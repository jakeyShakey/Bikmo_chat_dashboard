import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Pagination } from "../common/Pagination.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { fmtFull } from "../../utils/formatters.js";

const PAGE_SIZE = 25;

export function FeedbackTable({ rows }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((rows?.length ?? 0) / PAGE_SIZE));
  const pageRows = (rows ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!rows || rows.length === 0) return <EmptyState message="No feedback in the selected period" />;

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ color: "#8a8f9e", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 16px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Date</th>
            <th style={{ color: "#8a8f9e", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 16px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Sentiment</th>
            <th style={{ color: "#8a8f9e", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 16px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Conversation ID</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => (
            <tr key={row.id}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={{ padding: "10px 16px", color: "#8a8f9e", fontSize: 12, fontFamily: "'DM Mono', monospace", borderBottom: "1px solid rgba(255,255,255,0.04)", whiteSpace: "nowrap" }}>
                {fmtFull(row.created_at)}
              </td>
              <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {row.feedback ? <ThumbsUp size={14} color="#4ade80" /> : <ThumbsDown size={14} color="#f87171" />}
              </td>
              <td style={{ padding: "10px 16px", color: "#555", fontSize: 11, fontFamily: "'DM Mono', monospace", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {row.conversation_id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
    </div>
  );
}
