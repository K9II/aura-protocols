-- Optional shipping protection at checkout (2026-10-13). Before this every
-- retail order carried the charge (orders.insurance_cents, legacy name); now the
-- customer chooses, and the order records the choice and the wording version
-- shown (PROTECTION_TERMS_VERSION in src/lib/shipping-protection.ts) — the
-- decline is evidence in a "not received" dispute. Null = no choice offered
-- (older orders, no-charge and wholesale orders). Safe to re-run.

alter table orders add column if not exists protection text;
alter table orders drop constraint if exists orders_protection_check;
alter table orders add constraint orders_protection_check check (protection is null or protection in ('accepted', 'declined'));
alter table orders add column if not exists protection_terms text;
alter table orders drop constraint if exists orders_protection_terms_check;
alter table orders add constraint orders_protection_terms_check check ((protection is null) = (protection_terms is null));
-- A declined order carries no charge; an accepted one does.
alter table orders drop constraint if exists orders_protection_charge_check;
alter table orders add constraint orders_protection_charge_check check (
  protection is null or (protection = 'declined') = (insurance_cents = 0));
