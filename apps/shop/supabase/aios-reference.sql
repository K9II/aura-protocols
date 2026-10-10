-- AIOS reference figures for the owner's wholesale margins page (apply after
-- supplier-prices.sql). One row per kind, copied from the AIOS shop-economics
-- sheet by scripts/sync-supplier-prices.mjs (AIOS stays where they're kept):
--   fulfillment  — the default 3PL's per-order fees, postage and insurance
--   processor    — the GLP-1 processor's percent (they never go through Stripe)
--   competitors  — competitors' single-vial prices per store strength
--   lab          — the default lab's test price per store strength
-- Read-only reference: nothing charges or records from it. Business-private:
-- RLS on, no policies (service role, server only).
create table if not exists aios_reference (
  kind       text primary key check (kind in ('fulfillment', 'processor', 'competitors', 'lab')),
  data       jsonb not null,
  synced_at  timestamptz not null default now()
);
alter table aios_reference enable row level security;
