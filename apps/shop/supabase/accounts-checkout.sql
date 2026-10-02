-- Accounts, checkout and orders (2026-09-28). Apply in the Aura Store
-- project (the one SUPABASE_URL points at). Service role only: RLS enabled
-- with no policies, so the anon key can never read these tables.

create extension if not exists pgcrypto;
create sequence if not exists order_number_seq start 1001;

create table if not exists customers (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text not null,
  organization        text,
  is_owner            boolean not null default false,
  stripe_customer_id  text unique,
  ship_name           text,
  ship_line1          text,
  ship_line2          text,
  ship_city           text,
  ship_state          text,
  ship_zip            text,
  created_at          timestamptz not null default now()
);
alter table customers enable row level security;

create table if not exists account_agreements (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references customers(id) on delete cascade,
  terms_version   text not null,
  age_21          boolean not null,
  ruo             boolean not null,
  dispute_policy  boolean not null,
  ip_hash         text,
  user_agent      text,
  agreed_at       timestamptz not null default now()
);
create index if not exists account_agreements_customer_idx on account_agreements (customer_id, agreed_at desc);
alter table account_agreements enable row level security;

create table if not exists orders (
  id                     uuid primary key default gen_random_uuid(),
  order_number           text not null unique default ('AP-' || nextval('order_number_seq')),
  customer_id            uuid not null references customers(id),
  email                  text not null,
  status                 text not null default 'awaiting_payment'
                         check (status in ('awaiting_payment','processing','paid','shipped','cancelled','refunded')),
  ship_name              text not null,
  ship_line1             text not null,
  ship_line2             text,
  ship_city              text not null,
  ship_state             text not null check (char_length(ship_state) = 2),
  ship_zip               text not null,
  subtotal_cents         integer not null check (subtotal_cents >= 0),
  shipping_cents         integer not null check (shipping_cents >= 0),
  insurance_cents        integer not null default 0 check (insurance_cents >= 0),
  tax_cents              integer not null default 0,
  total_cents            integer not null,
  ruo_confirmed_at       timestamptz not null,
  stripe_session_id      text unique,
  stripe_payment_intent  text,
  tracking_number        text,
  carrier                text,
  paid_at                timestamptz,
  shipped_at             timestamptz,
  cancelled_at           timestamptz,
  refunded_at            timestamptz,
  expires_at             timestamptz not null,
  created_at             timestamptz not null default now()
);
create index if not exists orders_customer_idx on orders (customer_id, created_at desc);
create index if not exists orders_status_idx on orders (status, created_at desc);
alter table orders enable row level security;

create table if not exists order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete cascade,
  compound_slug     text not null,
  compound_name     text not null,
  variant_id        text not null,
  strength          text not null,
  pack_qty          integer not null check (pack_qty > 0),
  quantity          integer not null check (quantity > 0),
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  line_total_cents  integer not null check (line_total_cents >= 0),
  lot_number        text not null
);
create index if not exists order_items_order_idx on order_items (order_id);
alter table order_items enable row level security;

create table if not exists stripe_events (
  event_id      text primary key,
  type          text not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text
);
alter table stripe_events enable row level security;
