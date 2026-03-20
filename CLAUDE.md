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
  App.jsx                        # Root shell — renders layout + active tab page
  context/DashboardContext.jsx   # Global state: active tab, date range, refresh token
  hooks/use*Data.js              # One data-fetching hook per tab (5 total)
  pages/                         # One page component per tab (Overview, Compliance, Conversations, Feedback, Escalations)
  components/
    common/                      # StatCard, ChartCard, StatusBadge, LoadingSkeleton, EmptyState, Pagination, Section
    layout/                      # Header, TabNav, DateRangeSelector
    overview|compliance|conversations|feedback|escalations/  # Feature-specific components
  utils/                         # formatters.js, grouping helpers
supabase/functions/dashboard-stats/index.ts   # Single edge function, all endpoints
```

## Architecture & Data Flow

1. `DashboardContext` owns: `activeTab`, `dateRange` (from/to strings), `refreshToken` (increment to force re-fetch), `lastUpdated`
2. Each page calls its own `use*Data()` hook → fetches from the single edge function with `?endpoint=<name>&from=<date>&to=<date>`
3. Edge function queries Postgres and returns aggregated JSON — no raw table access from the frontend
4. All chart data uses `recharts` — wrap charts in `<ChartCard>`, stats in `<StatCard>`

## Database Tables

- `chat_responses` — one row per processed conversation (`conversation_id`, `messages_processed`, `escalated`, `created_at`)
- `feedback_responses` — user thumbs up/down (`feedback: boolean`, `conversation_id`, `created_at`)
- `compliance_audits` — AI compliance checks (`compliant` column aliased as `status` in queries, `confidence` 1–10 int, `flags[]`, `reasoning`, `audited_at`)
- `escalations` — escalated convos with Zendesk data (`zendesk_ticket_id`, `customer_name`, `customer_email`, `message_count_at_escalation`, `escalated_at`)

## Critical Gotchas

- **`compliance_audits.compliant` column is aliased**: All Supabase queries must use `select("status:compliant, ...")` — the column is named `compliant` in Postgres but exposed as `status` everywhere in the app. Never query it as `compliant` from the frontend.
- **Confidence is 1–10, not 0–100**: The `confidence` field is stored as an integer 1–10. Multiply by 10 to display as a percentage. Both the edge function and frontend components do this.
- **Date filter for compliance audits uses `audited_at`, not `created_at`**: Always pass `field = "audited_at"` to `applyDateFilter()` for `compliance_audits`. Other tables use the default `created_at`.
- **Latest record wins**: Feedback and compliance audits are resolved per-conversation by taking the most recent entry (`created_at` / `audited_at`). There can be multiple rows per `conversation_id`.
- **Vite is beta (8.0.0-beta.13)**: Occasionally has rough edges. If build behaviour seems odd, check for Vite 8 beta-specific issues before assuming app bugs.
- **Supabase anon key is in `src/config.js`**: This is intentional — it's a public client key with row-level security. Do not move it to `.env` unless also adding dotenv support. If adding new sensitive config (service role keys etc.), use `.env.local` and never commit.

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
