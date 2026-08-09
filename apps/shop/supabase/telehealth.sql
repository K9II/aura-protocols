-- apps/shop/supabase/telehealth.sql
-- Run in the Supabase SQL editor for the DEDICATED Aura Telehealth project
-- (separate from the shop/engine project, so the telehealth business can spin
-- out cleanly as its own company). Client: getTelehealthSupabaseClient().

create table if not exists telehealth_optins (
  email text primary key,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists telehealth_events (
  delivery_id text primary key,           -- X-LegUpRx-Delivery (idempotency key)
  event text not null,                    -- X-LegUpRx-Event
  payload jsonb not null,
  received_at timestamptz not null default now()
);
