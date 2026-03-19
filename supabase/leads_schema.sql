-- Run in Supabase SQL editor (once)
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  site text not null,
  name text not null,
  email text not null,
  phone text,
  intent text not null,
  source_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leads_site_created_at_idx on public.leads(site, created_at desc);
create index if not exists leads_email_idx on public.leads(email);

alter table public.leads enable row level security;

-- API uses service role key, so this can stay strict for anon users.
drop policy if exists "No direct anonymous inserts" on public.leads;
create policy "No direct anonymous inserts"
on public.leads
for insert
to anon
with check (false);
