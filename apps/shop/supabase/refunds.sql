-- Part 10: refunds from the admin (spec 2026-10-07-admin-refunds-design.md).
-- Apply after no-charge.sql. Stripe-dashboard refunds leave these null.

alter table orders add column if not exists refund_destination text;
alter table orders drop constraint if exists orders_refund_destination_check;
alter table orders add constraint orders_refund_destination_check check (refund_destination is null or refund_destination in ('card', 'store_credit'));
alter table orders add column if not exists refund_reason text;
alter table orders drop constraint if exists orders_refund_reason_check;
alter table orders add constraint orders_refund_reason_check check (refund_reason is null or refund_reason in ('customer_cancelled', 'damaged', 'not_received', 'wrong_item', 'goodwill', 'other'));
alter table orders add column if not exists refund_note text;
alter table orders add column if not exists refunded_by uuid references customers(id) on delete set null;
alter table orders add column if not exists stripe_refund_id text;

-- The card part of a shipped exception refunded as store credit.
alter table store_credit_ledger drop constraint if exists store_credit_ledger_reason_check;
alter table store_credit_ledger add constraint store_credit_ledger_reason_check
  check (reason in ('payout','order_spend','order_refund','owner_adjust','order_cancel','refund_to_credit'));
drop index if exists store_credit_ledger_order_once;
create unique index store_credit_ledger_order_once on store_credit_ledger (reason, ref_id)
  where reason in ('order_spend','order_refund','payout','order_cancel','refund_to_credit');
