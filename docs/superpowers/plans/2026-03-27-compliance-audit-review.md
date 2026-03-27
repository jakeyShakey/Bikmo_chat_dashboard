# Compliance Audit Review Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add conversation visibility and human Agree/Disagree feedback to every compliance audit row, backed by new reviewer columns on `compliance_audits` and a new edge function endpoint.

**Architecture:** Four nullable reviewer columns are added to `compliance_audits` via a SQL migration. The existing `compliance` edge function endpoint is extended to return `messages_processed` (fetched from `chat_responses`) and the new reviewer columns alongside each audit. A new `audit-feedback` POST endpoint saves verdicts. `AuditTable.jsx` is updated to show: a Review status column, a side-by-side conversation+reasoning expanded panel, and a feedback bar.

**Tech Stack:** Supabase Postgres (SQL migration), Supabase Edge Functions (TypeScript/Deno), React 19 (JS, inline styles), `useAuth()` from `AuthContext`, `EDGE_FN` from `src/config.js`.

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/20260327000000_compliance_audit_reviewer_columns.sql` | **Create** — SQL migration adding 4 columns |
| `supabase/functions/dashboard-stats/index.ts` | **Modify** — extend `compliance` GET, add `audit-feedback` POST |
| `src/components/compliance/AuditTable.jsx` | **Modify** — Review column, side-by-side expanded row, feedback bar |

---

## Chunk 1: Database Migration

---

### Task 1: Create the SQL migration file

**Files:**
- Create: `supabase/migrations/20260327000000_compliance_audit_reviewer_columns.sql`

- [ ] **Step 1: Ensure the migrations directory exists, then create the migration file**

The `supabase/migrations/` directory already exists (it was created as part of this project setup). If it doesn't exist for any reason, create it: `mkdir -p supabase/migrations`.

```sql
-- Migration: add human-review columns to compliance_audits
-- All columns are nullable — existing rows remain valid with NULLs.

ALTER TABLE public.compliance_audits
  ADD COLUMN IF NOT EXISTS reviewer_verdict  text
    CHECK (reviewer_verdict IN ('agree', 'disagree')),
  ADD COLUMN IF NOT EXISTS reviewer_notes    text,
  ADD COLUMN IF NOT EXISTS reviewed_by       text,
  ADD COLUMN IF NOT EXISTS reviewed_at       timestamptz;
```

- [ ] **Step 2: Apply the migration via Supabase CLI**

```bash
supabase db push
```

Expected: migration applied with no errors. If you get a "column already exists" error, the `IF NOT EXISTS` guards handle it — re-run is safe.

- [ ] **Step 3: Verify the columns exist**

In the Supabase dashboard (Table Editor → compliance_audits) or via psql, confirm all four columns are present with correct types and the check constraint on `reviewer_verdict`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260327000000_compliance_audit_reviewer_columns.sql
git commit -m "feat: add reviewer columns to compliance_audits"
```

---

## Chunk 2: Edge Function — compliance GET extension

---

### Task 2: Extend the compliance endpoint to return reviewer fields + conversation text

**Files:**
- Modify: `supabase/functions/dashboard-stats/index.ts:133-185`

The compliance endpoint currently ends at line 184 with:
```ts
return json({ summary, auditsByDay, flagFrequency, audits: sortedAudits });
```

- [ ] **Step 1: Update the select query to include reviewer columns**

Replace line 136:
```ts
supabase.from("compliance_audits").select("id, conversation_id, status:compliant, confidence, flags, reasoning, audited_at"),
```
With:
```ts
supabase.from("compliance_audits").select("id, conversation_id, status:compliant, confidence, flags, reasoning, audited_at, reviewer_verdict, reviewer_notes, reviewed_by, reviewed_at"),
```

- [ ] **Step 2: Replace the final `sortedAudits` block to also fetch and merge `messages_processed`**

Replace lines 181–184 inclusive (the comment `// Full audit list sorted desc`, the `sortedAudits` declaration, the blank line, and the `return json(...)`):
```ts
    // Full audit list sorted desc
    const sortedAudits = [...rows].sort((a, b) => new Date(b.audited_at).getTime() - new Date(a.audited_at).getTime());

    return json({ summary, auditsByDay, flagFrequency, audits: sortedAudits });
```
With:
```ts
    // Fetch conversation text for each audit (latest-wins per conversation_id)
    const convIds = rows.map((r: any) => r.conversation_id).filter(Boolean);
    const { data: convoRows } = convIds.length > 0
      ? await supabase
          .from("chat_responses")
          .select("conversation_id, messages_processed")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    // latest-wins: first occurrence wins because results are ordered newest-first
    const convoMap: Record<string, string | null> = {};
    (convoRows ?? []).forEach((c: any) => {
      if (!(c.conversation_id in convoMap)) {
        convoMap[c.conversation_id] = c.messages_processed ?? null;
      }
    });

    // Full audit list sorted desc, with conversation text merged in
    const sortedAudits = [...rows]
      .sort((a: any, b: any) => new Date(b.audited_at).getTime() - new Date(a.audited_at).getTime())
      .map((a: any) => ({ ...a, messages_processed: convoMap[a.conversation_id] ?? null }));

    return json({ summary, auditsByDay, flagFrequency, audits: sortedAudits });
```

- [ ] **Step 3: Verify the function still compiles (type-check)**

```bash
cd supabase/functions/dashboard-stats && deno check index.ts
```

Expected: no errors. If Deno isn't installed locally, skip this step and rely on the deploy step to surface errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/dashboard-stats/index.ts
git commit -m "feat: extend compliance endpoint with reviewer fields and conversation text"
```

---

## Chunk 3: Edge Function — audit-feedback POST endpoint

---

### Task 3: Add the audit-feedback POST endpoint

**Files:**
- Modify: `supabase/functions/dashboard-stats/index.ts:324-335` (just before the legacy `stats` block and the final `Unknown endpoint` return)

- [ ] **Step 1: Insert the new endpoint block**

Add the following block **between** the closing `}` of the `feedback` endpoint (line 322) and the `// ── LEGACY ALIASES` comment (line 324):

```ts
  // ── AUDIT FEEDBACK ───────────────────────────────────────────────────────────
  if (endpoint === "audit-feedback") {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
    }

    const body = await req.json().catch(() => null);
    const { audit_id, verdict, notes } = body ?? {};

    if (!audit_id || !["agree", "disagree"].includes(verdict)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: corsHeaders });
    }

    // Server-side length guard (matches frontend maxLength=1000)
    if (notes && notes.length > 1000) {
      return new Response(JSON.stringify({ error: "Notes too long (max 1000 chars)" }), { status: 400, headers: corsHeaders });
    }

    // compliance_audits.id is a UUID — no coercion needed
    const reviewedBy = user.email ?? user.id; // fallback to user id if email absent

    const { error: updateError } = await supabase
      .from("compliance_audits")
      .update({
        reviewer_verdict: verdict,
        reviewer_notes: notes ?? null,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", audit_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: corsHeaders });
    }

    return json({ ok: true });
  }
```

- [ ] **Step 2: Verify the function compiles**

```bash
cd supabase/functions/dashboard-stats && deno check index.ts
```

Expected: no errors.

- [ ] **Step 3: Deploy the edge function**

```bash
supabase functions deploy dashboard-stats
```

Expected: deployment succeeds. The "Verify JWT" toggle in the Supabase dashboard must remain **OFF** for this function (JWT is verified in code).

- [ ] **Step 4: Smoke-test the new endpoint**

From your terminal, grab a valid access token from the browser (open DevTools → Application → Local Storage → find `sb-...` key, extract `access_token`), then:

```bash
curl -X POST "https://dxsncwpfxvcuwniquoim.supabase.co/functions/v1/dashboard-stats?endpoint=audit-feedback" \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"audit_id":"<A_REAL_UUID_FROM_COMPLIANCE_AUDITS>","verdict":"agree","notes":"test note"}'
```

Expected response: `{"ok":true}`

Test invalid payload:
```bash
curl -X POST "https://dxsncwpfxvcuwniquoim.supabase.co/functions/v1/dashboard-stats?endpoint=audit-feedback" \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"audit_id":"fake","verdict":"invalid"}'
```

Expected response: `{"error":"Invalid payload"}` with HTTP 400.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/dashboard-stats/index.ts
git commit -m "feat: add audit-feedback POST endpoint"
```

---

## Chunk 4: Frontend — AuditTable Review Column

---

### Task 4: Add the Review column to the audit table

**Files:**
- Modify: `src/components/compliance/AuditTable.jsx`

This task adds the state and the table column only. The expanded row changes come in Task 5.

- [ ] **Step 1: Add new imports and the `submitFeedback` helper**

At the top of `AuditTable.jsx`, update imports and add the helper function just after the `PAGE_SIZE` constant:

```js
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
```

- [ ] **Step 2: Add `feedbackState` to the component and the `useAuth` call**

Inside `AuditTable`, directly after the existing `useState` declarations (after `const [expandedId, setExpandedId] = useState(null);`), add:

```js
  const { session } = useAuth();

  const [feedbackState, setFeedbackState] = useState(() =>
    Object.fromEntries(
      (audits ?? []).map(a => [
        a.id,
        {
          verdict: a.reviewer_verdict ?? null,
          notes: a.reviewer_notes ?? "",
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
    setFeedbackState(prev => {
      const next = { ...prev };
      (audits ?? []).forEach(a => {
        const existing = next[a.id];
        const inProgress = existing && (existing.saving || existing.editing);
        if (!inProgress) {
          next[a.id] = {
            verdict: a.reviewer_verdict ?? null,
            notes: a.reviewer_notes ?? "",
            saving: false,
            error: null,
            editing: false,
          };
        }
      });
      return next;
    });
  }, [audits]);
```

- [ ] **Step 3: Add the Review column header**

In the `<thead>` block, add the new `<th>` as the 6th column, after the existing "Reasoning" `<th>`:

Replace:
```jsx
            <th style={{ ...thStyle("reasoning"), cursor: "default" }}>Reasoning</th>
```
With:
```jsx
            <th style={{ ...thStyle("reasoning"), cursor: "default" }}>Reasoning</th>
            <th style={{ ...thStyle("review"), cursor: "default" }}>Review</th>
```

- [ ] **Step 4: Add the Review badge cell to each table row**

In each `<tr>` (the main data row), add a new `<td>` for the review badge. Place it after the existing Reasoning/chevron `<td>` (which currently ends at the `ChevronRight` icon):

Replace:
```jsx
                <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <ChevronRight size={14} color="#555" style={{ transform: expandedId === row.id ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                </td>
```
With:
```jsx
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
```

Note: `onClick={e => e.stopPropagation()}` prevents the Review cell from toggling the row expansion.

- [ ] **Step 5: Update `colSpan` on the expanded row from 5 to 6**

Find the expanded row `<td colSpan={5}` and change it to `<td colSpan={6}`:

```jsx
                  <td colSpan={6} style={{ padding: "0 16px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
```

- [ ] **Step 6: Verify in browser**

Run `npm run dev`, open the Compliance tab, confirm:
- The table now has 6 columns with "Review" on the right
- Each row shows "Pending" (grey) unless already reviewed
- Expanding a row still works (the colSpan now covers all 6 columns)

- [ ] **Step 7: Commit**

```bash
git add src/components/compliance/AuditTable.jsx
git commit -m "feat: add Review column and feedback state to AuditTable"
```

---

## Chunk 5: Frontend — Expanded Row with Conversation + Feedback Bar

---

### Task 5: Replace the expanded row panel with side-by-side layout and feedback bar

**Files:**
- Modify: `src/components/compliance/AuditTable.jsx` (the expanded row section only)

- [ ] **Step 1: Replace the existing expanded row content**

Find the expanded row block (the `<tr>` that renders when `expandedId === row.id`). Currently it looks like:

```jsx
              {expandedId === row.id && (
                <tr>
                  <td colSpan={6} style={{ padding: "0 16px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 14, marginTop: 4 }}>
                      <p style={...}>Reasoning</p>
                      <p ...>{row.reasoning || "No reasoning provided"}</p>
                      {(row.flags ?? []).length > 0 && (...)}
                    </div>
                  </td>
                </tr>
              )}
```

Replace **the entire contents of that `<td>`** (keep the `<td colSpan={6}>` wrapper) with:

```jsx
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
```

- [ ] **Step 2: Add the feedback bar below the two-column panel**

Immediately after the closing `</div>` of the two-column grid (still inside the `<td>`), add the feedback bar. This uses an IIFE to select the right state variant cleanly:

```jsx
                    {/* ── Feedback bar ── */}
                    {(() => {
                      const fb = feedbackState[row.id] ?? { verdict: null, notes: "", saving: false, error: null, editing: false };
                      const isReviewed = fb.verdict != null && !fb.editing;
                      const isEditing = fb.editing || fb.verdict == null;

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
                          setFb({ saving: false, editing: false });
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
```

- [ ] **Step 3: Verify in the browser**

Run `npm run dev`, go to the Compliance tab, expand an audit row. Confirm:
- Left panel shows conversation text in a scrollable pre block (or "No conversation data available" if null)
- Right panel shows reasoning and all flags
- Feedback bar shows Agree/Disagree buttons and notes input
- Clicking Agree highlights the button; clicking again deselects it
- Save is disabled until a verdict is chosen
- After saving, the bar switches to the "Reviewed" state showing the verdict chip and Edit button
- Review column badge updates immediately on save (no page reload needed)
- Clicking Edit repopulates the form; Cancel restores the reviewed state

- [ ] **Step 4: Test an error case**

Temporarily break the edge function URL (add a typo to `EDGE_FN` in the component, or just submit with no network). Confirm the inline red error message appears and controls re-enable.

Revert the typo.

- [ ] **Step 5: Verify persistence**

Save a verdict, then reload the page. The verdict should persist (it comes from the DB via the edge function on the next load — `feedbackState` is initialised from `audits` prop which comes from the server).

- [ ] **Step 6: Commit**

```bash
git add src/components/compliance/AuditTable.jsx
git commit -m "feat: side-by-side expanded row with conversation, reasoning, and feedback bar"
```

---

## Final Verification Checklist

- [ ] `npm run dev` — compliance tab loads, no console errors
- [ ] Expanded row: conversation in left panel, reasoning + flags in right
- [ ] Null `messages_processed` → "No conversation data available" shown
- [ ] Agree/Disagree toggles work; Save disabled until verdict selected
- [ ] Save → "Saving…" state → success → Review badge updates immediately
- [ ] Reload → verdict persists (from DB)
- [ ] Edit → form pre-populated → Cancel restores reviewed state
- [ ] Error case → inline red error, controls re-enabled
- [ ] Supabase table direct check: `reviewer_verdict`, `reviewer_notes`, `reviewed_by`, `reviewed_at` correct
- [ ] Edge function deployed: `supabase functions deploy dashboard-stats`
- [ ] Invalid POST payload → 400 response
