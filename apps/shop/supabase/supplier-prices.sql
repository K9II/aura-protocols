-- Supplier box prices (apply after catalog-ops.sql). One row per supplier and
-- strength: what one box of 10 vials costs from that supplier. Copied from the
-- AIOS shop-economics sheet by scripts/sync-supplier-prices.mjs (AIOS stays
-- where prices are maintained); Admin → Wholesale → Record order pre-fills its
-- total from here. Prices are business-private: RLS on, no policies (service
-- role, server only).
create table if not exists supplier_prices (
  supplier    text not null check (length(trim(supplier)) between 1 and 80),
  slug        text not null,
  variant_id  text not null,
  box_cents   integer not null check (box_cents > 0),
  source      text not null default 'aios',
  synced_at   timestamptz not null default now(),
  primary key (supplier, slug, variant_id),
  foreign key (slug, variant_id) references catalog_variants(slug, variant_id) on delete cascade
);
create index if not exists supplier_prices_variant_idx on supplier_prices (slug, variant_id);
alter table supplier_prices enable row level security;
