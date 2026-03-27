import React, { useState, useMemo, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge.jsx";
import { Pagination } from "../common/Pagination.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { fmtFull } from "../../utils/formatters.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { EDGE_FN } from "../../config.js";

const PAGE_SIZE = 20;

async function submitFeedback(auditId, verdict, notes, accessToken) {
  const res = await fetch(`${EDGE_FN}?endpoint=audit-feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ audit_id: auditId, verdict, notes: notes || null }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || "Failed to save");
  }
  return true;
}

export function AuditTable({ audits }) {
  const [sortField, setSortField] = useState("audited_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const { session } = useAuth();

  const [feedbackState, setFeedbackState] = useState(() =>
    Object.fromEntries(
      (audits ?? []).map(a => [
        a.id,
        {
          verdict: a.reviewer_verdict ?? null,
          notes: a.reviewer_notes ?? "",
          saved: a.reviewer_verdict != null, // true only when persisted to DB
          saving: false,
          error: null,
          editing: false,
        },
      ])
    )
  );

  // Sync feedbackState when audits prop changes (e.g. date range change)
  // Preserves in-progress edits; overwrites idle entries from server data
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFeedbackState(prev => {
      const next = { ...prev };
      (audits ?? []).forEach(a => {
        const existing = next[a.id];
        const inProgress = existing && (existing.saving || existing.editing);
        if (!inProgress) {
          next[a.id] = {
            verdict: a.reviewer_verdict ?? null,
            notes: a.reviewer_notes ?? "",
            saved: a.reviewer_verdict != null,
            saving: false,
            error: null,
            editing: false,
          };
        }
      });
      return next;
    });
  }, [audits]);

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
            <th style={{ ...thStyle("review"), cursor: "default" }}>Review</th>
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
                  {row.confidence != null ? `${Math.round(row.confidence * 10)}%` : "—"}
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
                <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }} onClick={e => e.stopPropagation()}>
                  {(() => {
                    const v = feedbackState[row.id]?.verdict ?? null;
                    if (v === "agree") return (
                      <span style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "2px 8px", color: "#22c55e", fontSize: 10, whiteSpace: "nowrap" }}>Agreed ✓</span>
                    );
                    if (v === "disagree") return (
                      <span style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "2px 8px", color: "#f87171", fontSize: 10, whiteSpace: "nowrap" }}>Disagreed ✗</span>
                    );
                    return (
                      <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "2px 8px", color: "#6b7280", fontSize: 10, whiteSpace: "nowrap" }}>Pending</span>
                    );
                  })()}
                </td>
              </tr>
              {expandedId === row.id && (
                <tr>
                  <td colSpan={6} style={{ padding: "0 16px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

                    {/* ── Two-column panel ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>

                      {/* LEFT: Conversation */}
                      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 14 }}>
                        <p style={{ color: "#8a8f9e", fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Conversation</p>
                        {row.messages_processed ? (
                          <pre style={{ color: "#c0c4d0", fontSize: 12, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowY: "auto", maxHeight: 300 }}>
                            {row.messages_processed}
                          </pre>
                        ) : (
                          <p style={{ color: "#6b7280", fontSize: 12, margin: 0, fontStyle: "italic" }}>No conversation data available</p>
                        )}
                      </div>

                      {/* RIGHT: Reasoning + Flags */}
                      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 14 }}>
                        <p style={{ color: "#8a8f9e", fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Reasoning</p>
                        <p style={{ color: "#c0c4d0", fontSize: 13, margin: 0, lineHeight: 1.6 }}>{row.reasoning || "No reasoning provided"}</p>
                        {(row.flags ?? []).length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <p style={{ color: "#8a8f9e", fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>All Flags</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {row.flags.map((f, i) => (
                                <span key={i} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "2px 10px", color: "#f87171", fontSize: 11 }}>{f}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Feedback bar ── */}
                    {(() => {
                      const fb = feedbackState[row.id] ?? { verdict: null, notes: "", saved: false, saving: false, error: null, editing: false };
                      const isReviewed = fb.saved && !fb.editing;

                      const setFb = (patch) => setFeedbackState(prev => ({
                        ...prev,
                        [row.id]: { ...prev[row.id], ...patch },
                      }));

                      // Pass fb explicitly so verdict/notes are always the same-render snapshot
                      const handleSave = async (currentFb) => {
                        if (!currentFb.verdict) return;
                        setFb({ saving: true, error: null });
                        try {
                          await submitFeedback(row.id, currentFb.verdict, currentFb.notes, session?.access_token);
                          setFb({ saving: false, saved: true, editing: false });
                        } catch (err) {
                          setFb({ saving: false, error: err.message });
                        }
                      };

                      const barStyle = {
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: 8,
                        padding: "12px 14px",
                        marginTop: 10,
                        border: "1px solid rgba(255,255,255,0.06)",
                      };
                      const labelStyle = {
                        color: "#8a8f9e", fontSize: 10, fontFamily: "'DM Mono', monospace",
                        textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px",
                      };

                      // ── State 2: Reviewed (not editing) ──
                      if (isReviewed) {
                        return (
                          <div style={barStyle}>
                            <p style={labelStyle}>Your verdict</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span style={{
                                background: fb.verdict === "agree" ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.1)",
                                border: `1px solid ${fb.verdict === "agree" ? "rgba(34,197,94,0.3)" : "rgba(248,113,113,0.2)"}`,
                                borderRadius: 8, padding: "4px 12px",
                                color: fb.verdict === "agree" ? "#22c55e" : "#f87171",
                                fontSize: 12, fontWeight: 500,
                              }}>
                                {fb.verdict === "agree" ? "✓ Agreed" : "✗ Disagreed"}
                              </span>
                              {fb.notes && (
                                <span style={{ color: "#c0c4d0", fontSize: 12 }}>"{fb.notes}"</span>
                              )}
                              {row.reviewed_by && (
                                <span style={{ color: "#6b7280", fontSize: 11 }}>— {row.reviewed_by}</span>
                              )}
                              <button
                                onClick={() => setFb({ editing: true })}
                                style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "3px 10px", color: "#8a8f9e", fontSize: 11, cursor: "pointer", marginLeft: "auto" }}
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // ── State 1 / State 3: Unreviewed or editing ──
                      return (
                        <div style={barStyle}>
                          <p style={labelStyle}>Your verdict</p>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <button
                              disabled={fb.saving}
                              onClick={() => setFb({ verdict: fb.verdict === "agree" ? null : "agree" })}
                              style={{
                                background: fb.verdict === "agree" ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.06)",
                                border: `1px solid ${fb.verdict === "agree" ? "rgba(34,197,94,0.5)" : "rgba(34,197,94,0.2)"}`,
                                borderRadius: 8, padding: "6px 14px", color: "#22c55e",
                                fontSize: 12, cursor: fb.saving ? "not-allowed" : "pointer", opacity: fb.saving ? 0.5 : 1,
                              }}
                            >
                              ✓ Agree
                            </button>
                            <button
                              disabled={fb.saving}
                              onClick={() => setFb({ verdict: fb.verdict === "disagree" ? null : "disagree" })}
                              style={{
                                background: fb.verdict === "disagree" ? "rgba(248,113,113,0.2)" : "rgba(248,113,113,0.06)",
                                border: `1px solid ${fb.verdict === "disagree" ? "rgba(248,113,113,0.5)" : "rgba(248,113,113,0.2)"}`,
                                borderRadius: 8, padding: "6px 14px", color: "#f87171",
                                fontSize: 12, cursor: fb.saving ? "not-allowed" : "pointer", opacity: fb.saving ? 0.5 : 1,
                              }}
                            >
                              ✗ Disagree
                            </button>
                            <input
                              disabled={fb.saving}
                              value={fb.notes}
                              maxLength={1000}
                              placeholder="Add a note (optional)..."
                              onChange={e => setFb({ notes: e.target.value })}
                              style={{
                                flex: 1, minWidth: 180, background: "#0e1018",
                                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                                padding: "6px 10px", color: "#c0c4d0", fontSize: 12,
                                opacity: fb.saving ? 0.5 : 1,
                              }}
                            />
                            <button
                              disabled={fb.saving || !fb.verdict}
                              onClick={() => handleSave(fb)}
                              style={{
                                background: fb.verdict && !fb.saving ? "#2563eb" : "rgba(37,99,235,0.3)",
                                border: "none", borderRadius: 8, padding: "6px 16px",
                                color: "#fff", fontSize: 12,
                                cursor: (fb.verdict && !fb.saving) ? "pointer" : "not-allowed",
                              }}
                            >
                              {fb.saving ? "Saving…" : "Save"}
                            </button>
                            {fb.editing && (
                              <button
                                disabled={fb.saving}
                                onClick={() => setFb({ editing: false, verdict: row.reviewer_verdict ?? null, notes: row.reviewer_notes ?? "" })}
                                style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", color: "#8a8f9e", fontSize: 12, cursor: "pointer" }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                          {fb.error && (
                            <p style={{ color: "#f87171", fontSize: 11, margin: "6px 0 0" }}>{fb.error}</p>
                          )}
                        </div>
                      );
                    })()}

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
