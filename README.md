# Reagan Family Budget

A private, two-person budgeting, savings, and debt-planning app for Blake and Amanda.

- **Shared household model:** one category tree and one combined budget; every transaction is tagged to the Blake or Amanda ledger and both roll into one budget-to-actuals dashboard.
- **Stack:** Next.js (App Router) + TypeScript, Tailwind CSS v4, Supabase (Postgres + Auth + RLS), Recharts, TanStack Query, React Hook Form + Zod.
- **Security:** Google sign-in restricted to two emails via a Supabase auth trigger, Row Level Security on every table, and Next.js middleware.

## Features

- 3-level category tree (category / sub / sub-sub), seeded with a YNAB/Quicken-style starter set, fully editable.
- Manual transaction entry (income & expense) per ledger.
- Monthly budgets per category and a combined budget-vs-actual dashboard with variance, progress bars, and charts.
- Debt planner: snowball vs avalanche comparison, payoff timelines, interest totals, debt-to-income ratio, and a "pay this first" recommendation.
- Money formatting: USD, dates like "Monday, June 1, 2026", expenses in red with a leading `-$`, income in near-black with `$`.

## Local setup

1. Create a Supabase project at https://supabase.com.
2. In the SQL editor, run the migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_seed_categories.sql`
3. Enable Google as an auth provider (Authentication -> Providers -> Google) and add your Google OAuth client ID/secret. Set the redirect URL to `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback` for local dev).
4. Copy `.env.local.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in with an approved Google account.

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel project settings.
4. Add your Vercel production and preview URLs to Supabase Auth -> URL Configuration (redirect URLs) and to the Google OAuth authorized redirect URIs.

## Allowlist

Approved accounts are defined in two places (keep them in sync):

- `lib/config.ts` -> `ALLOWED_EMAILS`
- `supabase/migrations/0001_init.sql` -> `is_allowed_user()` and `handle_new_user()`
