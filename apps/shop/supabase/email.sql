-- supabase/email.sql — email automations part 1 (2026-10-03).
-- Run after storefront.sql and accounts-checkout.sql. RLS on, no policies:
-- only the service role (server) reads or writes these tables.

-- Rows from the old list stay 'pending': they never confirmed opt-in to these emails (decision 2026-10-03).
alter table subscribers add column if not exists status text not null default 'pending'
  check (status in ('pending','confirmed','unsubscribed'));
alter table subscribers add column if not exists confirm_token_hash text;
alter table subscribers add column if not exists confirmed_at timestamptz;
alter table subscribers add column if not exists partner_ref text;
alter table subscribers add column if not exists welcome_code text;
alter table subscribers add column if not exists welcome_code_expires_at timestamptz;
alter table subscribers add column if not exists welcome_code_used_order_id uuid references orders(id) on delete set null;
create unique index if not exists subscribers_welcome_code_idx on subscribers (welcome_code) where welcome_code is not null;
create unique index if not exists subscribers_confirm_token_idx on subscribers (confirm_token_hash) where confirm_token_hash is not null;
-- Rows unsubscribed before this migration keep their state.
update subscribers set status = 'unsubscribed' where unsubscribed_at is not null and status <> 'unsubscribed';

create table if not exists email_sends (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  kind            text not null check (kind in ('confirm','welcome_1','welcome_2','welcome_3','welcome_4','welcome_5','cart_1','cart_2','cart_3','lot_alert')),
  ref             text,
  ses_message_id  text,
  sent_at         timestamptz not null default now(),
  unique nulls not distinct (email, kind, ref)
);
create index if not exists email_sends_email_idx on email_sends (email);
alter table email_sends enable row level security;

create table if not exists lot_announcements (
  id           uuid primary key default gen_random_uuid(),
  lots         text[] not null,
  sent_by      uuid references customers(id) on delete set null,
  recipients   integer not null default 0,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
alter table lot_announcements enable row level security;

alter table orders add column if not exists welcome_code text;
