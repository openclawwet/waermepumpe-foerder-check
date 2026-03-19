# Supabase Lead Storage Setup

## 1) Create table
Run SQL from `supabase/leads_schema.sql` in Supabase SQL Editor.

## 2) Required Vercel env vars
Set these in Vercel for this project (Production + Preview as needed):

- `SUPABASE_URL` (e.g. `https://xxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` (service role secret; server-side only)

> Do **not** expose the service role key to client-side code.

## 3) API behavior
`/api/lead` now validates and stores:

- `site`
- `name`
- `email`
- `phone` (optional)
- `intent` (mapped from form `goal`)
- `source_url`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- `created_at` (DB default)

If required env vars are missing, API returns:

- HTTP 500
- `{ ok: false, error: "server_not_configured", ... }`

## 4) Deploy
After env vars are set:

```bash
vercel --prod
```

## 5) Quick verification
Submit lead form and run in Supabase SQL editor:

```sql
select site, name, email, phone, intent, created_at
from public.leads
order by created_at desc
limit 20;
```
