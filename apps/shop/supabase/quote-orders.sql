-- Wholesale quote orders (mocks 2026-10-17 "Quote Order Mocks"): an accepted volume
-- quote (50+ kits, priced by hand) becomes an order the customer pays by bank
-- transfer or card, then follows the usual run → balance → ship path.
-- Apply after wholesale-review.sql, lot-costs.sql and refunds.sql. Safe to re-run.
-- RLS on, no policies: service role, server only.

-- A quote order waits as 'quoted' (Awaiting deposit) until the deposit lands.
-- Its own status keeps it clear of everything that cancels unpaid checkouts.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (status in
  ('awaiting_payment','processing','quoted','deposit_paid','balance_due','paid','shipped','cancelled','refunded'));

-- The customer adds the ship-to address and the research-use confirmation on
-- their pay page, so a quoted order may have neither yet; every other order must.
alter table orders alter column ship_name drop not null;
alter table orders alter column ship_line1 drop not null;
alter table orders alter column ship_city drop not null;
alter table orders alter column ship_state drop not null;
alter table orders alter column ship_zip drop not null;
alter table orders alter column ruo_confirmed_at drop not null;
alter table orders drop constraint if exists orders_ship_required_check;
alter table orders add constraint orders_ship_required_check check (
  status = 'quoted' or (ship_name is not null and ship_line1 is not null and ship_city is not null
    and ship_state is not null and ship_zip is not null and ruo_confirmed_at is not null));

alter table orders add column if not exists quote_inquiry_id uuid references inquiries(id) on delete set null;
alter table orders add column if not exists quote_valid_until date;              -- the pay link stops after this shop date
alter table orders add column if not exists quote_note text check (quote_note is null or char_length(quote_note) <= 600);
alter table orders add column if not exists quote_pay_bank boolean not null default false;
alter table orders add column if not exists quote_pay_card boolean not null default false;
alter table orders add column if not exists quote_created_by uuid references customers(id);
alter table orders drop constraint if exists orders_quote_shape_check;
alter table orders add constraint orders_quote_shape_check check (
  quote_valid_until is null or (channel = 'wholesale' and (quote_pay_bank or quote_pay_card)));
create index if not exists orders_quoted_idx on orders (quote_valid_until) where status = 'quoted';

-- How each wholesale payment arrived. Card payments keep their Stripe payment
-- intent; a bank transfer is recorded by the owner with the bank's reference.
alter table orders add column if not exists deposit_method text check (deposit_method is null or deposit_method in ('card','bank'));
alter table orders add column if not exists deposit_bank_ref text check (deposit_bank_ref is null or char_length(deposit_bank_ref) <= 120);
alter table orders add column if not exists deposit_received_on date;
alter table orders add column if not exists balance_method text check (balance_method is null or balance_method in ('card','bank'));
alter table orders add column if not exists balance_bank_ref text check (balance_bank_ref is null or char_length(balance_bank_ref) <= 120);
alter table orders add column if not exists balance_received_on date;
alter table orders add column if not exists transfer_recorded_by uuid references customers(id);
-- The customer said a transfer is on its way (notifies the owner; changes nothing else).
alter table orders add column if not exists transfer_sent_at timestamptz;
alter table orders add column if not exists transfer_sent_for text check (transfer_sent_for is null or transfer_sent_for in ('deposit','balance'));

-- A deposit paid by bank transfer is refunded by bank transfer, by hand.
alter table orders drop constraint if exists orders_refund_destination_check;
alter table orders add constraint orders_refund_destination_check check (refund_destination is null or refund_destination in ('card', 'store_credit', 'bank'));

-- The account customers send transfers to (Admin → Wholesale → Settings).
-- Bank transfer can't be offered until all four main fields are set.
alter table shop_settings add column if not exists bank_account_name text check (bank_account_name is null or char_length(bank_account_name) <= 120);
alter table shop_settings add column if not exists bank_name text check (bank_name is null or char_length(bank_name) <= 120);
alter table shop_settings add column if not exists bank_routing text check (bank_routing is null or bank_routing ~ '^[0-9]{9}$');
alter table shop_settings add column if not exists bank_account text check (bank_account is null or bank_account ~ '^[0-9]{4,17}$');
alter table shop_settings add column if not exists bank_note text check (bank_note is null or char_length(bank_note) <= 300);

-- Owner actions on quote orders, shown on the order's timeline (admin_events).
-- Replaces the list in no-charge.sql; if that file is re-run, re-apply this one after it.
alter table admin_events drop constraint if exists admin_events_action_check;
alter table admin_events add constraint admin_events_action_check check (action in (
  'order_shipped', 'order_refunded',
  'partner_approved', 'partner_declined', 'partner_suspended', 'partner_reinstated',
  'payout_paid', 'w9_opened', 'w9_checked',
  'inquiries_seen',
  'staff_disabled', 'staff_enabled', 'staff_signed_out',
  'no_charge_created', 'no_charge_cancelled',
  'quote_order_created', 'bank_transfer_recorded', 'quote_order_cancelled', 'bank_details_saved'));
