# Bikmo Chat Dashboard

Analytics dashboard for monitoring Bikmo's AI chatbot performance — conversations, compliance, feedback, and escalations. Internal tool only.

## Tech Stack

- **Frontend**: React 19, JavaScript (no TypeScript), Vite 8 (beta)
- **Charts**: Recharts 3, icons via Lucide React
- **Backend**: Supabase (Postgres) + Supabase Edge Functions (TypeScript/Deno)
- **Styling**: Inline style objects throughout — no CSS modules, no Tailwind, no CSS-in-JS library
- **No tests** currently exist

## Commands

```bash
npm run dev        # Dev server (Vite HMR) — http://localhost:5173
npm run build      # Production build → ./dist
npm run preview    # Preview production build locally
npm run lint       # ESLint check
```

Edge function deploy (from project root):
```bash
supabase functions deploy dashboard-stats
```

## Project Structure

```
src/
  config.js                      # Supabase anon key + edge function URL + date presets
  App.jsx                        # Root shell — auth gate + renders layout + active tab page
  context/
    DashboardContext.jsx         # Global state: active tab, date range, refresh token
    AuthContext.jsx              # Auth state: session, user, loading, signOut
  hooks/
    use*Data.js                  # One data-fetching hook per tab (5 total)
    useSupabaseClient.js         # Singleton Supabase client (createClient called once)
  pages/
    LoginPage.jsx                # Google OAuth sign-in page
    (other pages)                # One page component per tab
  components/
    common/                      # StatCard, ChartCard, StatusBadge, LoadingSkeleton, EmptyState, Pagination, Section
    layout/                      # Header, TabNav, DateRangeSelector, UserMenu
    overview|compliance|conversations|feedback|escalations/  # Feature-specific components
  utils/                         # formatters.js, grouping helpers
supabase/functions/dashboard-stats/index.ts   # Single edge function, all endpoints
```

## Architecture & Data Flow

1. `AuthContext` wraps the entire app — gates access via `AuthGate` in `App.jsx`; unauthenticated users see `LoginPage`
2. `DashboardContext` owns: `activeTab`, `dateRange` (from/to strings), `refreshToken` (increment to force re-fetch), `lastUpdated`
3. Each page calls its own `use*Data()` hook → fetches from the single edge function with `?endpoint=<name>&from=<date>&to=<date>`, passing `session.access_token` in the `Authorization` header
4. Edge function verifies the JWT via `adminClient.auth.getUser(token)` before processing any request
5. Edge function queries Postgres and returns aggregated JSON — no raw table access from the frontend
6. All chart data uses `recharts` — wrap charts in `<ChartCard>`, stats in `<StatCard>`

## Authentication

- **Provider**: Google OAuth via Supabase Auth — restricted to `@bikmo.com` accounts
- **Access control**: A `Before User Created` hook runs a Postgres function (`public.hook_restrict_signup_by_email_domain`) that blocks non-bikmo.com signups at the Auth level
- **New users**: Must be invited or sign in with a `@bikmo.com` Google account — no self-registration for other domains
- **Session**: Stored in localStorage by the Supabase client. `AuthContext` uses `onAuthStateChange` as the sole source of truth for session state (do not use `getSession()` on mount — causes a race condition with the OAuth callback hash)
- **Edge function auth**: JWT verification is handled **in code** via `adminClient.auth.getUser(token)`. The Supabase platform-level "Verify JWT" toggle on the function must be **OFF** — if both are enabled, the platform rejects the request before the function code runs

## Database Tables

- `chat_responses` — one row per processed conversation (`conversation_id`, `messages_processed`, `escalated`, `created_at`)
- `feedback_responses` — user thumbs up/down (`feedback: boolean`, `conversation_id`, `created_at`)
- `compliance_audits` — AI compliance checks (`compliant` column aliased as `status` in queries, `confidence` 1–10 int, `flags[]`, `reasoning`, `audited_at`). Also has human reviewer columns: `reviewer_verdict` (`'agree'`/`'disagree'`/`'flag'`/`NULL`), `reviewer_notes`, `reviewed_by` (email), `reviewed_at`
- `escalations` — escalated convos with Zendesk data (`zendesk_ticket_id`, `customer_name`, `customer_email`, `message_count_at_escalation`, `escalated_at`)

## Security Model

- **Anon key** (`src/config.js`): Public client key, safe to expose in frontend. Used only to initialise the Supabase client for auth.
- **Service role key**: Never in the frontend. Only used inside the edge function via `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`. Bypasses RLS — kept server-side only.
- **Edge function**: Validates every request with `adminClient.auth.getUser(token)`. Unauthenticated or invalid requests get a 401 before any data is queried.
- **New sensitive config**: Use `.env.local` and never commit. Do not add service role keys or other secrets to `src/config.js`.

## Critical Gotchas

- **`compliance_audits.compliant` column is aliased**: All Supabase queries must use `select("status:compliant, ...")` — the column is named `compliant` in Postgres but exposed as `status` everywhere in the app. Never query it as `compliant` from the frontend.
- **Confidence is 1–10, not 0–100**: The `confidence` field is stored as an integer 1–10. Multiply by 10 to display as a percentage. Both the edge function and frontend components do this.
- **Date filter for compliance audits uses `audited_at`, not `created_at`**: Always pass `field = "audited_at"` to `applyDateFilter()` for `compliance_audits`. Other tables use the default `created_at`.
- **Latest record wins**: Feedback and compliance audits are resolved per-conversation by taking the most recent entry (`created_at` / `audited_at`). There can be multiple rows per `conversation_id`.
- **Vite is beta (8.0.0-beta.13)**: Occasionally has rough edges. If build behaviour seems odd, check for Vite 8 beta-specific issues before assuming app bugs.
- **Supabase anon key is in `src/config.js`**: This is intentional — it's a public client key. Do not move it to `.env` unless also adding dotenv support. If adding new sensitive config (service role keys etc.), use `.env.local` and never commit.
- **Supabase tokens are ES256, not HS256**: Newer Supabase projects issue JWTs signed with ES256 (elliptic curve). Do not attempt to verify them with `SUPABASE_JWT_SECRET` (HS256). Always verify via `adminClient.auth.getUser(token)` — this calls the Auth API directly and handles ES256 correctly.
- **Edge function "Verify JWT" platform toggle must be OFF**: The Supabase dashboard has a per-function "Verify JWT" toggle (Edge Functions → function → Settings). This must be disabled when doing auth verification in code — if both are on, Supabase rejects the request at the platform level before your code runs, resulting in a 401 that looks like your code's fault but isn't.
- **`onAuthStateChange` not `getSession()` on mount**: Using `getSession()` then `onAuthStateChange` separately creates a race condition — `loading` gets set to `false` before the OAuth callback hash is processed, briefly rendering the login page and losing the session. Use `onAuthStateChange` alone; it fires immediately with the current session on mount.
- **`AuditTable` feedback state uses a `saved` flag, not just `verdict`**: Both the expanded panel chip (`isReviewed`) and the table-row Review chip are gated on `feedbackState[id].saved`, not `feedbackState[id].verdict != null`. `saved` is only set to `true` after a successful POST to `audit-feedback`. This prevents chips appearing before the user hits Save. Do not collapse these back into a single `verdict != null` check.
- **`reviewer_verdict` has three values**: `'agree'`, `'disagree'`, and `'flag'` (Flag for Improvement — compliant but response could be better). The edge function validation array and DB CHECK constraint must include all three. Colour coding: green (`#22c55e`) for agree, red (`#f87171`) for disagree, amber (`#f59e0b`) for flag.
- **Edge function has one POST endpoint**: `audit-feedback` is the only mutation endpoint — all others are GET. POST endpoints must parse `req.json()` for the body and respond 405 for non-POST methods. The `user` object (from JWT verification at the top of the handler) provides `user.email` for recording who submitted the feedback.

## Coding Conventions

- **Functional components only**, hooks for all state and side effects
- **Inline styles** for all styling — follow the dark theme palette already in use (`#0e1018` bg, `#f0f2f7` text, `#1a1f2e` cards, `#6b7280` muted)
- **Named exports** for all components and hooks (no default exports)
- **One component per file**, PascalCase filenames
- **Hook files**: camelCase (`useComplianceData.js`)
- **No PropTypes** — the codebase doesn't use them; don't add them
- When adding a new tab/feature, follow the pattern: page component → `use*Data` hook → feature components folder → edge function endpoint

## Adding a New Tab (Pattern)

1. Add endpoint handler in `supabase/functions/dashboard-stats/index.ts`
2. Create `src/hooks/use<Feature>Data.js` — copy pattern from `useOverviewData.js`
3. Create `src/pages/<Feature>Page.jsx`
4. Create `src/components/<feature>/` folder with KPI, chart, and table components
5. Add tab to `TabNav.jsx` and route in `App.jsx`
6. Deploy edge function: `supabase functions deploy dashboard-stats`

## What's Not Here (Yet)

- No TypeScript migration has been decided — don't introduce it without discussion
- No test framework — don't scaffold tests without discussion
- No CSS framework — inline styles are the deliberate choice for now
