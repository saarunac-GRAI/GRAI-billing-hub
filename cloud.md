# Billing Hub — Cloud & Infrastructure Notes

## Project Overview
Centralized billing and subscription tracking system for all GRAI projects.

## Repository
- **GitHub**: `GRAI-billing-hub`
- **Local path**: `e:/MLA/grai-billing-hub`
- **Isolation**: Fully standalone — no shared code with Global Reach AI repo

---

## Stack

| Layer | Service | Plan | Cost |
|-------|---------|------|------|
| Frontend + API | Next.js 14 (App Router) | — | Free |
| Hosting | Vercel | Hobby | Free |
| Database + Auth | Supabase | Free tier | Free |
| Gmail Ingestion | Gmail API (OAuth 2.0) | — | Free |
| Alert Emails | Gmail API send | — | Free |
| Scheduling | n8n (self-hosted) | Existing | Free |
| Charts | Recharts | — | Free |

---

## Vercel Deployment

- **Project name**: `grai-billing-hub`
- **Framework**: Next.js
- **Root directory**: `/`
- **Build command**: `npm run build`
- **Output directory**: `.next`
- **Node version**: 18.x

### Required Environment Variables (set in Vercel dashboard)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_USER=saarunac@gmail.com
NEXT_PUBLIC_APP_URL=https://grai-billing-hub.vercel.app
```

### Deploy Steps
1. Push to GitHub (`GRAI-billing-hub`)
2. Import project in Vercel dashboard → select repo
3. Add all environment variables
4. Deploy — auto-deploys on every push to `main`

---

## Supabase Setup

- **Project name**: `billing-hub`
- **Region**: Choose closest to your location
- **Plan**: Free tier

### Setup Steps
1. Create new project at https://supabase.com/dashboard
2. Go to SQL Editor → run `/supabase/migrations/001_initial_schema.sql`
3. Go to Authentication → Providers → Enable Google
4. Add Google OAuth credentials (same Client ID/Secret as below)
5. Set redirect URL: `https://grai-billing-hub.vercel.app/auth/callback`
6. Copy `Project URL` and `anon key` → add to Vercel env vars

### Free Tier Limits
- 500MB database storage
- No row limits
- 50,000 MAU
- 2GB bandwidth
- Free projects pause after 1 week inactivity (n8n daily checks prevent this)

---

## Google OAuth + Gmail API Setup

### Steps
1. Go to https://console.cloud.google.com
2. Create project: `billing-hub`
3. Enable APIs: **Gmail API**, **Google+ API** (for OAuth)
4. Create OAuth 2.0 credentials → Web Application
   - Authorized redirect URIs:
     - `https://your-supabase-project.supabase.co/auth/v1/callback`
     - `https://grai-billing-hub.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback` (dev)
5. For Gmail send/read (server-side): generate refresh token via OAuth playground
   - Scope: `https://www.googleapis.com/auth/gmail.readonly` + `https://www.googleapis.com/auth/gmail.send`
6. Save Client ID, Client Secret, and Refresh Token → add to Vercel env vars

---

## n8n Alert Workflow

### Workflow: Daily Renewal Check
- **Trigger**: Schedule — daily at 8:00 AM
- **Step 1**: GET `https://grai-billing-hub.vercel.app/api/alerts/pending`
  - Returns subscriptions with renewals in 1/3/7/14 days + overdue
- **Step 2**: For each alert → POST `https://grai-billing-hub.vercel.app/api/alerts/send`
  - Body: `{ subscription_id, alert_type, days_before }`
- **Authentication**: Pass `Authorization: Bearer <N8N_WEBHOOK_SECRET>` header

### Environment Variable
Add `N8N_WEBHOOK_SECRET` to both n8n and Vercel.

---

## Local Development

```bash
# Clone
git clone https://github.com/<your-username>/GRAI-billing-hub.git
cd GRAI-billing-hub

# Install
npm install

# Environment
cp .env.example .env.local
# Fill in .env.local with your Supabase + Google credentials

# Run Supabase migration
# (in Supabase dashboard SQL editor, run supabase/migrations/001_initial_schema.sql)

# Start dev server
npm run dev
# → http://localhost:3000
```

---

## Backup
- Supabase provides daily backups on paid plans
- Free tier: manual backup via `pg_dump` or Supabase dashboard export
- Recommended: weekly manual export of subscriptions table as CSV

---

## Cost Summary
**Total monthly cost: $0**
All services on free tiers. No credit card required except for Supabase (required for account creation but not charged on free tier).
