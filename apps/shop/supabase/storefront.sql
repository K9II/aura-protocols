-- Storefront tables (retail redesign, 2026-09-27). Apply in the shop's
-- Supabase project (the one SUPABASE_URL points at) via the SQL editor.
-- Service-role key bypasses RLS; RLS is enabled with no policies so the
-- anon key can never read these tables.

create extension if not exists pgcrypto;

create table if not exists gate_attestations (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  attested_at     timestamptz not null default now(),
  terms_version   text not null,
  age_21          boolean not null,
  ruo             boolean not null,
  dispute_policy  boolean not null,
  ip_hash         text,
  user_agent      text
);
create index if not exists gate_attestations_email_idx on gate_attestations (email);
alter table gate_attestations enable row level security;

create table if not exists subscribers (
  email            text primary key,
  source           text not null,
  subscribed_at    timestamptz not null default now(),
  unsubscribed_at  timestamptz
);
alter table subscribers enable row level security;

create table if not exists inquiries (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('wholesale', 'affiliate')),
  name          text not null,
  email         text not null,
  organization  text,
  message       text not null,
  created_at    timestamptz not null default now()
);
alter table inquiries enable row level security;
