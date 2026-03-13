# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build (also catches TypeScript errors)
npm run lint     # ESLint
```

No test suite configured. Run `npm run build` to catch type errors before pushing.

## Security & Privacy Rules (MANDATORY)

- **NEVER** store or request credit card numbers, CVVs, bank account numbers, or routing numbers
- **NEVER** integrate Plaid, Stripe Connect, or any service requiring direct bank credentials
- **For transaction import: CSV file upload only** — user downloads statement from their bank
- When asked to connect banks/cards directly, suggest: download CSV from capitalone.com or chase.com → Import via the CSV upload feature

## Architecture

**Single-user billing hub** — Next.js 16 (App Router) + TypeScript + Tailwind + Supabase + Gmail API.
- **DB**: Supabase project `elenjtimldyhkournbbn`
- **Hosting**: Vercel (saarunac-GRAI org) → `grai-billing-hub-2239i7qmq-saarunac-grais-projects.vercel.app`
- **GitHub**: `https://github.com/saarunac-GRAI/GRAI-billing-hub` — push to `master` → auto-deploys

### Auth Middleware

`proxy.ts` handles auth (Next.js 16 renamed `middleware.ts` → `proxy.ts`). All `app/(dashboard)/` routes redirect unauthenticated users to `/login`. Google OAuth via Supabase; callback at `/auth/callback`.

### Supabase Clients — Use the Right One

| Client | File | Use for |
|--------|------|---------|
| Service role (bypasses RLS) | `lib/supabase/admin.ts` | All API routes (`app/api/`) |
| Server client (respects RLS) | `lib/supabase/server.ts` | Server components and pages |

All API routes must include `export const dynamic = 'force-dynamic'`. The dashboard layout also has this.

### Personal Project Special Case

Transactions classified as `personal` have `project_id = NULL` — they are NOT linked to the Personal project UUID. When filtering by the Personal project:
- Query transactions by `classification = 'personal'` (not by `project_id`)
- Query subscriptions with `.or('project_id.is.null,project_id.eq.UUID')`
- Detect by checking if the project name contains "personal" (case-insensitive)

This is implemented in `app/api/dashboard/route.ts` and `app/api/reports/route.ts`.

### Transaction Classification Pipeline

1. CSV → `app/api/transactions/csv/route.ts`
2. Auto-detect format: Capital One (`Transaction Date,Debit,Credit`) / Chase (`Transaction Date,Amount`) / Generic
3. Filter out payments (negative amounts, payment keywords: PYMNT, MOBILE PAY, AUTOPAY, ACH PAYMENT)
4. Call `classifyTransaction(description, rules)` from `lib/classification/engine.ts` — iterates rules sorted by priority descending, first keyword match wins, returns `{classification, project_id, rule_id, category}`
5. Deduplicate by `(date, description, amount)` before insert
6. Store `classification`, `project_id`, `category`, `matched_rule_id` on each row

### Dashboard Data Sources

- **Subscription KPIs** — from `subscriptions` table
- **Monthly trend chart** — from `transactions` grouped by month (**NOT** `spending_history` which is empty/unused)
- **This month spend** — from `transactions` filtered to current month
- **3-month forecast** — computed from active subscription billing cycles

### Alert System

Thresholds: **14, 7, 3, 2, 1 days** before renewal — configured in `lib/utils.ts → getAlertDaysThresholds()`.

n8n calls `/api/alerts/pending` (GET) daily → returns pending alerts → calls `/api/alerts/send` (POST) per alert → sends email via Gmail API to `GMAIL_USER`. Both endpoints require `Authorization: Bearer {N8N_WEBHOOK_SECRET}`.

n8n workflow: `n8n/billing-hub-alerts.json` — local only, excluded from git.

## Key Conventions

- Use `toMonthlyCost(cost, cycle)` / `toYearlyCost(cost, cycle)` from `lib/utils.ts` for all subscription cost calculations
- Sanitize empty strings to `null` before Supabase inserts/updates — Supabase rejects `""` for UUID and date columns
- Standard categories: `Food | Groceries | Gas | Fitness | Utilities | Software | Shopping | Tuition | Healthcare | Entertainment | Other`
- All new API routes need `export const dynamic = 'force-dynamic'`

## Database Migrations

Located in `supabase/migrations/` — run manually in Supabase SQL Editor (no migration runner configured):
- `001_initial_schema.sql` — core tables (projects, subscriptions, spending_history, alerts, logs)
- `002_transactions_classification_push.sql` — transactions, classification_rules, push_subscriptions
- `003_category_column.sql` — adds `category` column + seeds keyword rules with categories
