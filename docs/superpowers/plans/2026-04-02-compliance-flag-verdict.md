# Compliance Feedback: Flag Verdict & Resizable Textarea Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third "Flag for Improvement" verdict to the compliance feedback system and make the notes field a resizable textarea.

**Architecture:** Three coordinated changes — a DB migration to widen the CHECK constraint, a one-line edge function update (+ redeploy), and UI changes to `AuditTable.jsx` (new button, updated chips, layout refactor, input → textarea).

**Tech Stack:** Postgres (Supabase), Deno/TypeScript edge function, React 19, inline styles

---

## Chunk 1: Database & Edge Function

### Task 1: DB migration

**Files:**
- Create: `supabase/migrations/20260402000000_compliance_audit_flag_verdict.sql`

The existing `reviewer_verdict` column has a CHECK constraint named `compliance_audits_reviewer_verdict_check` (Postgres auto-generated name). We drop it and re-add it with `'flag'` included.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260402000000_compliance_audit_flag_verdict.sql

ALTER TABLE public.compliance_audits
  DROP CONSTRAINT IF EXISTS compliance_audits_reviewer_verdict_check;

ALTER TABLE public.compliance_audits
  ADD CONSTRAINT compliance_audits_reviewer_verdict_check
    CHECK (reviewer_verdict IN ('agree', 'disagree', 'flag'));
```

- [ ] **Step 2: Run the migration**

If using the Supabase CLI with a linked project:
```bash
supabase db push
```

Or run the SQL directly in the Supabase dashboard SQL editor.

Expected: no errors. You can verify with:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_audits'::regclass AND contype = 'c';
```
Expected output: one row with `compliance_audits_reviewer_verdict_check` and definition `CHECK (reviewer_verdict = ANY (ARRAY['agree'::text, 'disagree'::text, 'flag'::text]))`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260402000000_compliance_audit_flag_verdict.sql
git commit -m "feat: add 'flag' to reviewer_verdict check constraint"
```

---

### Task 2: Edge function — allow `'flag'` verdict

**Files:**
- Modify: `supabase/functions/dashboard-stats/index.ts:353`

The validation at line 353 currently reads:
```typescript
if (!audit_id || !["agree", "disagree"].includes(verdict)) {
```

- [ ] **Step 1: Update the validation array**

Change line 353 to:
```typescript
if (!audit_id || !["agree", "disagree", "flag"].includes(verdict)) {
```

No other changes needed in this file.

- [ ] **Step 2: Deploy the edge function**

```bash
supabase functions deploy dashboard-stats
```

Expected output: `Deployed Functions dashboard-stats` (or similar success message).

> **Important:** The migration (Task 1) and this deploy must both be complete before testing the frontend. A `'flag'` POST will return a 400 "Invalid payload" until this function is redeployed.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/dashboard-stats/index.ts
git commit -m "feat: allow 'flag' verdict in audit-feedback endpoint"
```

---

## Chunk 2: AuditTable UI Changes

All changes are in `src/components/compliance/AuditTable.jsx`.

### Task 3: Fix the table-row Review column chip

Currently lines 151–162 read `feedbackState[row.id]?.verdict` without checking `saved`. This means clicking a button before saving would flip the chip prematurely. We replace the entire IIFE with a `saved`-gated version that also handles the new `"flag"` case.

**Files:**
- Modify: `src/components/compliance/AuditTable.jsx:151-163`

- [ ] **Step 1: Replace the IIFE in the Review column `<td>`**

Find this block (lines 151–162):
```jsx
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
```

Replace with:
```jsx
{(() => {
  const fb = feedbackState[row.id];
  const chipVerdict = fb?.saved && !fb?.editing ? fb.verdict : null;
  let chip;
  if (chipVerdict === "agree") {
    chip = { label: "Agreed ✓", color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)" };
  } else if (chipVerdict === "disagree") {
    chip = { label: "Disagreed ✗", color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" };
  } else if (chipVerdict === "flag") {
    chip = { label: "Flagged ⚑", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" };
  } else {
    chip = { label: "Pending", color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.2)" };
  }
  return (
    <span style={{ background: chip.bg, border: `1px solid ${chip.border}`, borderRadius: 10, padding: "2px 8px", color: chip.color, fontSize: 10, whiteSpace: "nowrap" }}>{chip.label}</span>
  );
})()}
```

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Open the Compliance tab. Rows with an existing `agree`/`disagree` verdict should still show their chip. Rows without should show "Pending". Clicking a verdict button (without saving) should NOT change the table-row chip.

- [ ] **Step 3: Commit**

```bash
git add src/components/compliance/AuditTable.jsx
git commit -m "fix: gate table-row Review chip on saved flag; add flag chip state"
```

---

### Task 4: Update the expanded panel reviewed-state chip

Currently lines 241–248 use binary colour/label logic. Replace with explicit four-way logic (including fallback for unexpected values).

**Files:**
- Modify: `src/components/compliance/AuditTable.jsx:235-264`

- [ ] **Step 1: Add verdict helper variables and update the chip**

In the `isReviewed` branch (the `if (isReviewed) { return (...) }` block starting at line 236), find the `<span>` chip at lines 241–249:

```jsx
<span style={{
  background: fb.verdict === "agree" ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.1)",
  border: `1px solid ${fb.verdict === "agree" ? "rgba(34,197,94,0.3)" : "rgba(248,113,113,0.2)"}`,
  borderRadius: 8, padding: "4px 12px",
  color: fb.verdict === "agree" ? "#22c55e" : "#f87171",
  fontSize: 12, fontWeight: 500,
}}>
  {fb.verdict === "agree" ? "✓ Agreed" : "✗ Disagreed"}
</span>
```

Replace with:
```jsx
{(() => {
  const verdictColour =
    fb.verdict === "agree" ? "#22c55e"
    : fb.verdict === "disagree" ? "#f87171"
    : fb.verdict === "flag" ? "#f59e0b"
    : "#6b7280";
  const verdictBg =
    fb.verdict === "agree" ? "rgba(34,197,94,0.12)"
    : fb.verdict === "disagree" ? "rgba(248,113,113,0.1)"
    : fb.verdict === "flag" ? "rgba(245,158,11,0.12)"
    : "rgba(107,114,128,0.1)";
  const verdictBorder =
    fb.verdict === "agree" ? "rgba(34,197,94,0.3)"
    : fb.verdict === "disagree" ? "rgba(248,113,113,0.2)"
    : fb.verdict === "flag" ? "rgba(245,158,11,0.3)"
    : "rgba(107,114,128,0.2)";
  const verdictText =
    fb.verdict === "agree" ? "✓ Agreed"
    : fb.verdict === "disagree" ? "✗ Disagreed"
    : fb.verdict === "flag" ? "⚑ Flag for Improvement"
    : `? ${fb.verdict}`;
  return (
    <span style={{
      background: verdictBg,
      border: `1px solid ${verdictBorder}`,
      borderRadius: 8, padding: "4px 12px",
      color: verdictColour,
      fontSize: 12, fontWeight: 500,
    }}>
      {verdictText}
    </span>
  );
})()}
```

- [ ] **Step 2: Verify visually**

With the dev server running, expand a previously reviewed row. The chip should still show correctly. (Full flag verdict testing comes in Task 6.)

- [ ] **Step 3: Commit**

```bash
git add src/components/compliance/AuditTable.jsx
git commit -m "feat: update reviewed chip to support flag verdict with amber styling"
```

---

### Task 5: Refactor bar layout and convert notes input to textarea

The feedback bar is currently a single flex row. We restructure it to two rows (buttons + Save/Cancel on row 1; textarea on row 2) and change the `<input>` to a `<textarea>`.

**Files:**
- Modify: `src/components/compliance/AuditTable.jsx:267-334`

- [ ] **Step 1: Replace the form div and notes input**

Find the return in the "State 1 / State 3" branch (line 268 onwards). The outer `<div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>` wraps all buttons, the input, Save, and Cancel.

Replace the entire form `<div>` (lines 271–333) with:

```jsx
<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
  {/* Row 1: buttons + Save + Cancel */}
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
    <button
      disabled={fb.saving}
      onClick={() => setFb({ verdict: fb.verdict === "flag" ? null : "flag" })}
      style={{
        background: fb.verdict === "flag" ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.06)",
        border: `1px solid ${fb.verdict === "flag" ? "rgba(245,158,11,0.5)" : "rgba(245,158,11,0.2)"}`,
        borderRadius: 8, padding: "6px 14px", color: "#f59e0b",
        fontSize: 12, cursor: fb.saving ? "not-allowed" : "pointer", opacity: fb.saving ? 0.5 : 1,
      }}
    >
      ⚑ Flag for Improvement
    </button>
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
  {/* Row 2: notes textarea */}
  <textarea
    disabled={fb.saving}
    value={fb.notes}
    maxLength={1000}
    placeholder="Add a note (optional)..."
    onChange={e => setFb({ notes: e.target.value })}
    style={{
      width: "100%", background: "#0e1018",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
      padding: "6px 10px", color: "#c0c4d0", fontSize: 12,
      opacity: fb.saving ? 0.5 : 1,
      resize: "vertical",
      minHeight: "80px",
      boxSizing: "border-box",
    }}
  />
  {fb.error && (
    <p style={{ color: "#f87171", fontSize: 11, margin: "2px 0 0" }}>{fb.error}</p>
  )}
</div>
```

Note: The `{fb.error && ...}` block that was previously after the flex div (lines 331–333) is now included inside the column layout, below the textarea.

- [ ] **Step 2: Verify dev server — no JS errors**

```bash
npm run dev
```

Open the Compliance tab, expand any audit row. The form should render: three verdict buttons on one row, a taller textarea below, Save/Cancel alongside the buttons. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/compliance/AuditTable.jsx
git commit -m "feat: add Flag for Improvement button; refactor bar to two-row layout; notes input → resizable textarea"
```

---

### Task 6: End-to-end verification

No code changes — this task confirms everything works together.

- [ ] **Step 1: Run the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check all verdict buttons**

Open the Compliance tab, expand any audit row.

- Three buttons visible: Agree (green), Disagree (red), Flag for Improvement (amber)
- Click "Flag for Improvement" → button highlights amber
- Click it again → deselects back (button returns to muted)
- While a button is selected but **not saved**, the table-row chip still shows "Pending"

- [ ] **Step 3: Save a flag verdict**

Select "Flag for Improvement", type a note, click Save.

Expected:
- Save button shows "Saving…" briefly
- Expanded panel switches to reviewed state: amber chip `⚑ Flag for Improvement` + the note in quotes
- Table-row chip switches to amber `Flagged ⚑`

- [ ] **Step 4: Confirm DB write**

In the Supabase dashboard, query:
```sql
SELECT id, reviewer_verdict, reviewer_notes, reviewed_by, reviewed_at
FROM compliance_audits
WHERE reviewer_verdict = 'flag'
ORDER BY reviewed_at DESC
LIMIT 5;
```
Expected: the row you just saved appears with `reviewer_verdict = 'flag'`.

- [ ] **Step 5: Test Edit flow**

Click Edit on the flagged row. Change verdict to Agree. Save.

Expected:
- Expanded chip updates to green `✓ Agreed`
- Table-row chip updates to green `Agreed ✓`

- [ ] **Step 6: Test textarea resize**

Drag the bottom-right handle of the notes textarea downward. It should resize vertically. Buttons above it should be unaffected.

- [ ] **Step 7: Confirm Agree and Disagree unchanged**

Save an Agree and a Disagree verdict. Both should work as before — green `✓ Agreed` / red `✗ Disagreed` chips in both the expanded panel and table row.

- [ ] **Step 8: Final lint check**

```bash
npm run lint
```

Expected: no errors.
