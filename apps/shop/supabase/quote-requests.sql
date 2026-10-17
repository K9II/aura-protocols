-- Volume-quote requests are orders from the moment the buyer sends them (mock
-- "Quote on the Order", Alvester 2026-10-17): status 'quote_requested', no prices
-- yet. The owner prices the same order (→ 'quoted', Awaiting deposit); the buyer
-- can cancel it or order the kits at the sheet price instead (→ 'cancelled').
-- Apply after quote-orders.sql. Safe to re-run. RLS on, no policies: server only.

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (status in
  ('awaiting_payment','processing','quote_requested','quoted','deposit_paid','balance_due','paid','shipped','cancelled','refunded'));

-- How a request ended without being priced (null = priced, or still open).
alter table orders add column if not exists quote_closed_reason text check (quote_closed_reason is null
  or quote_closed_reason in ('customer_cancelled','ordered_now','owner_cancelled'));

-- No address or research-use confirmation until the buyer's pay page. A request
-- or quote closed before the deposit (cancelled, expired, ordered at the sheet
-- price) may never have had one.
alter table orders drop constraint if exists orders_ship_required_check;
alter table orders add constraint orders_ship_required_check check (
  status in ('quote_requested','quoted')
  or (status = 'cancelled' and channel = 'wholesale' and deposit_paid_at is null)
  or (ship_name is not null and ship_line1 is not null and ship_city is not null
    and ship_state is not null and ship_zip is not null and ruo_confirmed_at is not null));

-- No deposit or balance until it's priced (a request closed unpriced never gets one).
alter table orders drop constraint if exists orders_wholesale_shape_check;
alter table orders add constraint orders_wholesale_shape_check check (
  channel = 'retail' or (wholesale_cutoff_on is not null and partner_id is null
    and (status = 'quote_requested' or (status = 'cancelled' and quote_closed_reason is not null)
      or (deposit_cents is not null and balance_cents is not null))));

-- When the owner priced it (the request itself is created_at).
alter table orders add column if not exists quote_priced_at timestamptz;

create index if not exists orders_quote_requested_idx on orders (created_at) where status = 'quote_requested';

-- Owner actions on requests, on the order's timeline (admin_events).
-- Replaces the list in quote-orders.sql; if that file is re-run, re-apply this one after it.
alter table admin_events drop constraint if exists admin_events_action_check;
alter table admin_events add constraint admin_events_action_check check (action in (
  'order_shipped', 'order_refunded',
  'partner_approved', 'partner_declined', 'partner_suspended', 'partner_reinstated',
  'payout_paid', 'w9_opened', 'w9_checked',
  'inquiries_seen',
  'staff_disabled', 'staff_enabled', 'staff_signed_out',
  'no_charge_created', 'no_charge_cancelled',
  'quote_order_created', 'bank_transfer_recorded', 'quote_order_cancelled', 'bank_details_saved',
  'quote_priced', 'quote_request_cancelled'));
