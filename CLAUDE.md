# GRAI Billing Hub — Claude Code Instructions

## Security & Privacy Rules (MANDATORY)

- **NEVER** store or request credit card numbers, CVVs, bank account numbers, or routing numbers in any form
- **NEVER** integrate Plaid, Stripe Connect, or any service requiring direct bank credentials
- **NEVER** add third-party services that require read/write access to bank accounts
- For transaction import: **CSV file upload only** — user downloads from their bank and uploads manually
- All sensitive env vars (API keys, secrets) must stay in `.env.local` and Vercel env settings — never commit them

## Alternative to Bank Integrations
When the user asks to connect to credit cards or banks directly, suggest:
1. Download CSV statement from bank website → Import via the CSV upload feature
2. Capital One: capitalone.com → Account → Download → CSV
3. Chase: chase.com → Account activity → Download → CSV
4. Other banks: Look for "Download transactions" or "Export" in account activity

## Project Structure
- **Stack**: Next.js (App Router) + TypeScript + Tailwind + Supabase + Gmail API
- **DB**: Supabase project `elenjtimldyhkournbbn`
- **Hosting**: Vercel (saarunac-GRAI org)
- **Auth**: Supabase Auth + Google OAuth
- **Email alerts**: Gmail API via `saarunac@gmail.com`

## Key Architectural Decisions
- `proxy.ts` instead of `middleware.ts` (Next.js 16 change)
- `export const dynamic = 'force-dynamic'` on all API routes and auth-gated layouts
- Supabase service role client in `lib/supabase/admin.ts` for all API routes (bypasses RLS)
- CSV import deduplicates by date+description+amount — safe to re-upload same file
- Payment rows (PYMNT, MOBILE PAY, AUTOPAY, etc.) are automatically filtered out on CSV import

## Alert Thresholds
Renewal alerts fire at: **14, 7, 3, 2, 1 days** before renewal date
Configured in `lib/utils.ts → getAlertDaysThresholds()`

## Classification Rules
Transactions auto-classified via keyword rules stored in `classification_rules` table.
Engine: `lib/classification/engine.ts`
To add rules: Settings → Auto-Classification Rules → Add Rule
Or run SQL in Supabase directly (see `supabase/migrations/`)
