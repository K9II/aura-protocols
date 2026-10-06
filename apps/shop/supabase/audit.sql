-- Audit trail for owner actions that have no log of their own (Orders,
-- Partners, Payouts, Today). Modules with their own log keep it:
-- customer_events, catalog_events, discount_code_events, email_admin_events,
-- dispute_events, owner_alerts (resolved_by). Server-only (RLS on, no policies).
create table if not exists admin_events (
  id          uuid primary key default gen_random_uuid(),
  area        text not null check (area in ('orders', 'partners', 'payouts', 'today')),
  action      text not null check (action in (
                'order_shipped', 'order_refunded',
                'partner_approved', 'partner_declined', 'partner_suspended', 'partner_reinstated',
                'payout_paid', 'w9_opened', 'w9_checked',
                'inquiries_seen')),
  target_id   text,            -- order / partner / payout id
  label       text,            -- what the owner recognises: order number, partner code
  detail      text,            -- e.g. "USPS 9400…", payout reference
  actor_id    uuid references customers(id) on delete set null,
  at          timestamptz not null default now()
);
create index if not exists admin_events_at_idx on admin_events (at desc);
create index if not exists admin_events_target_idx on admin_events (target_id, at desc);
alter table admin_events enable row level security;
revoke all on admin_events from anon, authenticated;

-- Email: edits to a draft campaign are logged too.
alter table email_admin_events drop constraint if exists email_admin_events_action_check;
alter table email_admin_events add constraint email_admin_events_action_check check (action in (
  'paused','resumed','created','scheduled','unscheduled','send_started','stopped','finished','test_sent','copied','edited'));
