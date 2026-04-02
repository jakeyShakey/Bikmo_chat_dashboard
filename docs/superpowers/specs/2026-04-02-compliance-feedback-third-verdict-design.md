# Compliance Feedback: Third Verdict & Resizable Textarea

**Date:** 2026-04-02

## Context

The compliance tab lets reviewers mark each AI audit as Agree or Disagree. A non-technical team member requested a third option for cases where the compliance bot correctly identified compliance status, but the bot's response could be improved (e.g. tone, article alignment, training opportunities). They also asked for the notes textarea to be resizable. These insights will be collated to improve articles or further train the bot.

## Changes

### 1. Database migration

File to create: `supabase/migrations/20260402000000_compliance_audit_flag_verdict.sql`

The existing migration added the `reviewer_verdict` column with an inline `CHECK` constraint. Postgres auto-generates a predictable name for this: `compliance_audits_reviewer_verdict_check`. Use `DROP CONSTRAINT IF EXISTS` with this name directly:

```sql
ALTER TABLE public.compliance_audits
  DROP CONSTRAINT IF EXISTS compliance_audits_reviewer_verdict_check;

ALTER TABLE public.compliance_audits
  ADD CONSTRAINT compliance_audits_reviewer_verdict_check
    CHECK (reviewer_verdict IN ('agree', 'disagree', 'flag'));
```

### 2. Edge function (`supabase/functions/dashboard-stats/index.ts`)

- Update verdict validation array from `["agree", "disagree"]` to `["agree", "disagree", "flag"]`
- No other logic changes required
- **Must be redeployed after the change:** `supabase functions deploy dashboard-stats`

> **Note:** The migration and the edge function redeploy are both required before the frontend change will work end-to-end. Do not test the frontend in isolation — a `'flag'` submission will be rejected with a 400 if the deployed function still has the old validation array.

### 3. AuditTable component (`src/components/compliance/AuditTable.jsx`)

#### 3a. Feedback form — three toggle buttons (one row)

| Button label | `verdict` value | Selected colour |
|---|---|---|
| Agree | `"agree"` | `#22c55e` (green) |
| Disagree | `"disagree"` | `#f87171` (red) |
| Flag for Improvement | `"flag"` | `#f59e0b` (amber) |

- Unselected state uses existing muted button style
- Flag button added immediately after the Disagree button in JSX
- Toggle-to-deselect: clicking an already-selected Flag button sets `verdict` back to `null` (same pattern as Agree/Disagree: `fb.verdict === "flag" ? null : "flag"`)

#### 3b. Reviewed state chip (expanded panel)

Replace the current binary colour/label logic with an explicit three-way version (with fallback for unexpected values):

```js
const verdictColour =
  fb.verdict === "agree" ? "#22c55e"
  : fb.verdict === "disagree" ? "#f87171"
  : fb.verdict === "flag" ? "#f59e0b"
  : "#6b7280"; // unexpected fallback

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

const verdictSymbol =
  fb.verdict === "agree" ? "✓"
  : fb.verdict === "disagree" ? "✗"
  : fb.verdict === "flag" ? "⚑"
  : "?";

const verdictLabel =
  fb.verdict === "agree" ? "Agreed"
  : fb.verdict === "disagree" ? "Disagreed"
  : fb.verdict === "flag" ? "Flag for Improvement"
  : fb.verdict;
```

Apply `verdictColour`, `verdictBg`, and `verdictBorder` to the chip's `color`, `background`, and `border` inline styles respectively. Chip text: `{verdictSymbol} {verdictLabel}`.

The `reviewed_by` byline rendered after the chip is unchanged — it continues to show for all three verdicts. Note: the byline reads from `row.reviewed_by` (the server-fetched object), so it will not appear immediately after a fresh Save — it appears on the next data fetch. This is pre-existing behaviour, not introduced by this change.

#### 3c. Review column chip (table row)

**Replace the entire chip IIFE in the Review column cell** (do not just add a new branch). The existing `agree`/`disagree` cases also lack the `saved` guard and must be fixed at the same time.

The new logic:

```js
// Inside the Review column <td>
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
```

A reviewer clicking a button before hitting Save must not flip the table-row chip — it stays "Pending" until `saved === true`.

#### 3d. Notes field — change `<input>` to `<textarea>` and update bar layout

The current notes field is a single-line `<input>`. `resize: "vertical"` has no effect on `<input>` — the element must be changed to a `<textarea>`. The `onChange` handler (`e.target.value`) works identically for both.

The feedback bar currently uses a single `display: flex; alignItems: center` row. Placing an 80px-tall `<textarea>` inline would awkwardly centre the buttons against it. **Change the bar to a two-row layout:**

- **Row 1:** verdict toggle buttons (Agree, Disagree, Flag for Improvement) + Save + Cancel (Cancel remains conditionally rendered: `{fb.editing && <button>Cancel</button>}`)
- **Row 2:** the `<textarea>` at full width below

Use a wrapping `div` with `display: flex; flexDirection: column; gap: 8px`. The error message `{fb.error && ...}` renders below Row 2 (below the textarea), same relative position as today.

The Cancel button's onClick handler is unchanged — it resets verdict and notes to `row.reviewer_verdict` / `row.reviewer_notes`. This correctly handles `"flag"` verdicts since those values will be persisted on `row` after a save.

Notes `<textarea>`:
```js
<textarea
  value={fb.notes}
  onChange={e => setFb({ notes: e.target.value })}
  maxLength={1000}
  placeholder="Add a note (optional)..."
  disabled={fb.saving}
  style={{
    // ...existing styles (width: "100%", padding, background, border, color, borderRadius, fontSize)...
    resize: "vertical",
    minHeight: "80px",
    opacity: fb.saving ? 0.5 : 1,
  }}
/>
```

## Files to modify

| File | Change |
|---|---|
| `supabase/migrations/20260402000000_compliance_audit_flag_verdict.sql` | New migration — dynamic drop + re-add check constraint |
| `supabase/functions/dashboard-stats/index.ts` | Add `"flag"` to verdict validation array; **redeploy required** |
| `src/components/compliance/AuditTable.jsx` | Add third button + deselect logic; update expanded chip with explicit 4-way colour/label/bg/border; replace table-row chip IIFE with `saved`-gated logic for all three verdicts; change notes `<input>` → `<textarea>` with `disabled`, resize, and two-row bar layout |

## Verification

1. Run migration against local/hosted Supabase DB
2. Deploy edge function: `supabase functions deploy dashboard-stats`
3. `npm run dev` → open Compliance tab, expand an audit row
4. Three buttons visible in one row: Agree (green), Disagree (red), Flag for Improvement (amber)
5. Click Flag for Improvement — button highlights amber; click again — deselects back to null
6. While filling in the form (before Save), the table-row chip still shows "Pending"
7. Select Flag for Improvement, add a note, Save → expanded chip shows amber `⚑ Flag for Improvement` with `reviewed_by` byline; table row chip shows amber `Flagged ⚑`
8. Confirm `reviewer_verdict = 'flag'` written to `compliance_audits` in Supabase
9. Hit Edit on a flagged row, change verdict to Agree, Save → expanded chip updates to green `✓ Agreed`; table-row chip updates to green `Agreed ✓`
10. Notes textarea is vertically resizable; buttons and Save remain on their own row above
11. Textarea is non-interactive while saving (disabled during POST)
12. Agree and Disagree flows unchanged
