# Compliance Audit Review Feature — Design Spec

**Date:** 2026-03-27
**Status:** Approved (post spec-review revision)

---

## Context

The compliance bot audits every conversation and records a verdict (`yes` / `no` / `review`), confidence score, flags, and reasoning in `compliance_audits`. Currently the dashboard shows these audits but gives no way for a compliance staff member to verify whether the bot's assessment was correct.

This feature adds two capabilities:
1. **Conversation visibility** — the expanded audit row shows the actual conversation the bot assessed (`messages_processed` from `chat_responses`), so reviewers can check the bot's reasoning against the source material.
2. **Human feedback** — reviewers can mark each audit as Agree or Disagree (with an optional free-text note), recording who reviewed it and when. This feeds internal reporting on bot accuracy and provides structured material for improving the compliance bot's prompt.

Access control: any authenticated `@bikmo.com` user can submit and overwrite feedback — no role restriction for now. Any reviewer can overwrite any existing verdict (no ownership lock).

---

## Database

### Migration

Add four nullable columns to `public.compliance_audits`:

```sql
ALTER TABLE public.compliance_audits
  ADD COLUMN reviewer_verdict  text        CHECK (reviewer_verdict IN ('agree', 'disagree')),
  ADD COLUMN reviewer_notes    text,
  ADD COLUMN reviewed_by       text,
  ADD COLUMN reviewed_at       timestamptz;
```

- `reviewer_verdict` — `'agree'` or `'disagree'`; `NULL` means not yet reviewed
- `reviewer_notes` — free-text note from the reviewer; `NULL` if none provided
- `reviewed_by` — reviewer's email (from Supabase auth JWT at write time)
- `reviewed_at` — timestamp of the review submission

All rows that existed before the migration remain valid with all four columns `NULL`. No rollback migration is required for this internal tool at this stage.

Migration file: `supabase/migrations/<timestamp>_compliance_audit_reviewer_columns.sql`

---

## Edge Function

File: `supabase/functions/dashboard-stats/index.ts`

### 1. Extend `compliance` endpoint (GET)

Replace the current select:
```ts
supabase.from("compliance_audits")
  .select("id, conversation_id, status:compliant, confidence, flags, reasoning, audited_at")
```

With (keeping the mandatory `status:compliant` alias, adding reviewer columns):
```ts
supabase.from("compliance_audits")
  .select("id, conversation_id, status:compliant, confidence, flags, reasoning, audited_at, reviewer_verdict, reviewer_notes, reviewed_by, reviewed_at")
```

After fetching audits, fetch the associated `messages_processed` values from `chat_responses` in a single `IN` query on `conversation_id` (same pattern as the `conversations` endpoint in this file). Because there may be multiple `chat_responses` rows per `conversation_id`, use latest-wins (same as everywhere else in the codebase):

```ts
const convIds = rows.map((r: any) => r.conversation_id).filter(Boolean);
const { data: convoRows } = convIds.length > 0
  ? await supabase
      .from("chat_responses")
      .select("conversation_id, messages_processed")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
  : { data: [] };

// latest-wins per conversation_id
const convoMap: Record<string, string | null> = {};
(convoRows ?? []).forEach((c: any) => {
  if (!(c.conversation_id in convoMap)) {
    convoMap[c.conversation_id] = c.messages_processed ?? null;
  }
});

const sortedAudits = [...rows]
  .sort((a: any, b: any) => new Date(b.audited_at).getTime() - new Date(a.audited_at).getTime())
  .map((a: any) => ({ ...a, messages_processed: convoMap[a.conversation_id] ?? null }));
```

Return `sortedAudits` (replaces the existing `sortedAudits` in the compliance endpoint).

### 2. New `audit-feedback` endpoint (POST)

Add before the final `Unknown endpoint` fallthrough. Handles only POST; respond 405 for other methods:

```ts
if (endpoint === "audit-feedback") {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const body = await req.json().catch(() => null);
  const { audit_id, verdict, notes } = body ?? {};

  if (!audit_id || !["agree", "disagree"].includes(verdict)) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: corsHeaders });
  }

  // Server-side notes length guard (matches frontend maxLength of 1000 chars)
  if (notes && notes.length > 1000) {
    return new Response(JSON.stringify({ error: "Notes too long (max 1000 chars)" }), { status: 400, headers: corsHeaders });
  }

  // `compliance_audits.id` is a UUID — pass as-is, no coercion needed
  const reviewedBy = user.email ?? user.id; // fallback to id if email absent

  const { error } = await supabase
    .from("compliance_audits")
    .update({
      reviewer_verdict: verdict,
      reviewer_notes: notes ?? null,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", audit_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
  return json({ ok: true });
}
```

`user.email` is available from the JWT verification step that runs at the top of the handler before any endpoint logic.

---

## Frontend

### Files modified

- `src/components/compliance/AuditTable.jsx` — primary changes (expanded row layout, feedback UI, review column)
- No new page files, no new hooks

### Auth access

`AuditTable` accesses the session via `useAuth()` directly (following the established pattern — `UserMenu` does the same):
```js
import { useAuth } from "../../context/AuthContext.jsx";
// inside AuditTable:
const { session } = useAuth();
```
Do **not** pass `session` as a prop from `CompliancePage` — that would break the single-source-of-truth pattern.

### Feedback POST helper

Define a small async function inside `AuditTable.jsx` (not a separate hook file — the mutation is tightly coupled to this component's UI state and is a single `fetch` call, not a data-fetching concern):

```js
async function submitFeedback(auditId, verdict, notes, accessToken) {
  const res = await fetch(
    `${EDGE_FN}?endpoint=audit-feedback`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ audit_id: auditId, verdict, notes: notes || null }),
    }
  );
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || "Failed to save");
  }
  return true;
}
```

`EDGE_FN` is already imported from `src/config.js` in other hooks — import it here too.

### Local feedback state

```js
// Keyed by audit id. Pre-populated from server data on first render.
const [feedbackState, setFeedbackState] = useState(() =>
  Object.fromEntries(
    (audits ?? []).map(a => [
      a.id,
      {
        verdict: a.reviewer_verdict ?? null,
        notes: a.reviewer_notes ?? "",
        saving: false,
        error: null,
        editing: false,   // true = form shown even if already reviewed
      },
    ])
  )
);
```

Use a lazy initialiser so it only runs once on mount. When `audits` prop changes (date range change / manual refresh), the `useEffect` applies this merge rule:

- If the entry is `saving: true` or `editing: true` — preserve local state entirely (do not overwrite mid-flight)
- Otherwise — overwrite from the fresh prop data (so a reload/refetch always surfaces the latest DB values)

```js
useEffect(() => {
  setFeedbackState(prev => {
    const next = { ...prev };
    (audits ?? []).forEach(a => {
      const existing = next[a.id];
      const inProgress = existing && (existing.saving || existing.editing);
      if (!inProgress) {
        // new entry or idle entry — sync from server data
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

### Table column — `Review`

Add as the rightmost column header (6th column total). **Important:** update the existing expanded row `<td colSpan={5}` to `colSpan={6}` — otherwise the expanded panel will not span the full table width. Each row cell shows:
- `Pending` — muted grey pill — when `feedbackState[row.id]?.verdict == null`
- `Agreed ✓` — green pill — when `verdict === 'agree'`
- `Disagreed ✗` — red pill — when `verdict === 'disagree'`

Source of truth for this badge is **`feedbackState`** (local state), not the raw `audits` prop. This means the badge updates immediately on save without a full data refetch.

### Expanded row — layout A (side-by-side)

Replace the current single reasoning box with the two-column + feedback bar layout:

```
┌──────────────────────────────────────────────────────────────────┐
│  LEFT PANEL (50%)                │  RIGHT PANEL (50%)            │
│  Label: "Conversation"           │  Label: "Reasoning"           │
│  <pre> messages_processed </pre> │  reasoning text               │
│  (scroll, max-height 300px)      │  ─────────────────────        │
│  If null: "No conversation data" │  Label: "All Flags"           │
│                                  │  flag pills                   │
├──────────────────────────────────────────────────────────────────┤
│  FEEDBACK BAR (full width)                                        │
│  [state-dependent content — see below]                            │
└──────────────────────────────────────────────────────────────────┘
```

**Conversation panel:** render `messages_processed` in a `<pre>` block with `overflow-y: auto`, `maxHeight: 300`, `whiteSpace: 'pre-wrap'`, `wordBreak: 'break-word'`. This matches exactly how `ConversationTable.jsx` already renders it. If null, show muted italic "No conversation data available".

### Feedback bar states

**State 1 — Unreviewed** (`verdict == null && !editing`):
```
[ ✓ Agree ]  [ ✗ Disagree ]  [___ Add a note (optional)... ___]  [ Save ]
```
- Agree / Disagree are toggle buttons; clicking one highlights it and sets local `verdict`
- Notes is a text `<input>` with `maxLength={1000}`, optional. No `onKeyDown` Enter-to-submit — Save button only.
- Save is disabled unless a verdict is selected
- While saving (`saving: true`): all controls disabled, Save shows "Saving…"
- On error: inline red error text below the bar, controls re-enabled

**State 2 — Reviewed** (`verdict != null && !editing`):
```
[ ✓ Agreed · "note text if any" · reviewed_by ]   [ Edit ]
(or: [ ✗ Disagreed · ... ])
```
- Verdict chip uses same green/red colours as the Review column badge
- `reviewed_by` shown as muted text
- Edit button switches to editing mode

**State 3 — Edit mode** (`editing: true`):
Same as State 1 but pre-populated with current `verdict` and `notes`. Save overwrites. Cancel button returns to State 2 without saving.

**On successful save:**
- Update `feedbackState[id]` with `{ verdict, notes, saving: false, error: null, editing: false }`
- The Review column badge updates immediately from this state

---

## Data Flow

```
User selects "Agree" verdict → clicks Save
  → feedbackState[id].saving = true  (controls disabled, "Saving…")
  → POST /dashboard-stats?endpoint=audit-feedback
      { audit_id, verdict: "agree", notes: "..." }
      Authorization: Bearer <session.access_token>
  → Edge fn: verifies JWT → UPDATE compliance_audits SET reviewer_verdict='agree', ...
  → { ok: true }
  → feedbackState[id] = { verdict: "agree", notes, saving: false, error: null, editing: false }
  → Review column badge shows "Agreed ✓" (driven by feedbackState, no refetch needed)

On error:
  → feedbackState[id].saving = false, error = "Failed to save"
  → inline error message shown below feedback bar
  → controls re-enabled so user can retry
```

---

## Reporting surface (future, out of scope)

The four reviewer columns are available for any future reporting. A minimal extension to the compliance endpoint could return:
- % of audits reviewed
- Agreement rate
- Disagreement notes list (for prompt-improvement export)

---

## Verification

1. `npm run dev` — compliance tab loads without error, no console errors
2. Expand an audit row — conversation text appears in left panel (`<pre>` block), reasoning in right, feedback bar below
3. For an audit with no `messages_processed` — left panel shows "No conversation data available"
4. Select Agree, add a note, click Save — spinner shown, Review column updates to "Agreed ✓", expanded row shows State 2 (reviewed)
5. Click Edit — form pre-populated with existing verdict and note
6. Submit Disagree — Review column updates to "Disagreed ✗"
7. Reload page — verdicts persist (data comes from DB via edge function, feedbackState re-initialised from `audits`)
8. Check Supabase table directly — `reviewer_verdict`, `reviewer_notes`, `reviewed_by`, `reviewed_at` all populated correctly on the right row
9. Simulate a POST to `audit-feedback` without a body / with an invalid verdict — confirm 400 response
10. Deploy edge function: `supabase functions deploy dashboard-stats`
