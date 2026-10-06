-- supabase/disputes.sql
-- Admin command center, part 6: Disputes. One row per Stripe dispute, kept
-- current by the webhook (lib/stripe-events.ts → record_dispute); early fraud
-- warnings; and each dispute's activity log. Run after accounts-checkout.sql
-- (orders, customers). Idempotent. RLS on, no policies: service role only.

create table if not exists disputes (
  id                   uuid primary key default gen_random_uuid(),
  stripe_dispute_id    text not null unique,
  order_id             uuid not null references orders(id),
  charge_id            text not null,
  payment_intent_id    text,
  amount_cents         integer not null check (amount_cents >= 0),
  currency             text not null default 'usd',
  reason               text not null,
  status               text not null,
  evidence_due_by      timestamptz,
  evidence_submitted   boolean not null default false,
  fee_cents            integer not null default 0,
  card_brand           text,
  card_last4           text,
  billing_address      text,
  draft                jsonb,
  draft_saved_at       timestamptz,
  evidence_files       jsonb not null default '{}'::jsonb,
  evidence_file_sha    text,
  submitted_at         timestamptz,
  submitted_by         uuid references customers(id) on delete set null,
  outcome              text,
  closed_at            timestamptz,
  funds_withdrawn_at   timestamptz,
  funds_reinstated_at  timestamptz,
  reminded             jsonb not null default '{}'::jsonb,  -- deadline reminders sent: {"3": at, "1": at}
  opened_at            timestamptz not null,                -- Stripe's dispute.created
  last_event_at        timestamptz not null,                -- newest Stripe event applied (out-of-order guard)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists disputes_order_idx on disputes (order_id);
create index if not exists disputes_open_idx on disputes (status, evidence_due_by);
create index if not exists disputes_opened_idx on disputes (opened_at);
alter table disputes enable row level security;
revoke all on disputes from anon, authenticated;

create table if not exists early_fraud_warnings (
  id               uuid primary key default gen_random_uuid(),
  stripe_efw_id    text not null unique,
  order_id         uuid not null references orders(id),
  charge_id        text not null,
  fraud_type       text not null,
  actionable       boolean not null default true,
  created_at       timestamptz not null,
  resolved_action  text check (resolved_action in ('refunded', 'watching', 'disputed', 'closed')),
  resolved_at      timestamptz,
  resolved_by      uuid references customers(id) on delete set null,
  check ((resolved_action is null) = (resolved_at is null))
);
create index if not exists efw_open_idx on early_fraud_warnings (created_at desc) where resolved_at is null;
create index if not exists efw_charge_idx on early_fraud_warnings (charge_id);
alter table early_fraud_warnings enable row level security;
revoke all on early_fraud_warnings from anon, authenticated;

-- Activity log. Webhook- and cron-driven entries carry an event_key
-- ("opened:dp_…", "reminder:3:<id>") so a replay never adds a second one.
create table if not exists dispute_events (
  id          uuid primary key default gen_random_uuid(),
  dispute_id  uuid not null references disputes(id) on delete cascade,
  action      text not null check (action in ('opened', 'funds_withdrawn', 'funds_reinstated', 'draft_saved', 'submitted', 'reminder', 'closed')),
  actor       uuid references customers(id) on delete set null,
  note        text,
  event_key   text unique,
  at          timestamptz not null default now()
);
create index if not exists dispute_events_dispute_idx on dispute_events (dispute_id, at desc);
alter table dispute_events enable row level security;
revoke all on dispute_events from anon, authenticated;

-- Insert, or refresh the Stripe-owned fields of, a dispute. An event older
-- than the newest one already applied changes nothing (Stripe doesn't promise
-- delivery order). evidence_submitted never goes back to false. Returns the id.
create or replace function record_dispute(
  p_stripe_id text, p_order uuid, p_charge text, p_pi text, p_amount integer, p_currency text,
  p_reason text, p_status text, p_due timestamptz, p_submitted boolean, p_fee integer,
  p_opened timestamptz, p_event_at timestamptz
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_closed boolean := p_status in ('won', 'lost', 'warning_closed', 'prevented');
begin
  insert into disputes as d (stripe_dispute_id, order_id, charge_id, payment_intent_id, amount_cents, currency, reason, status,
    evidence_due_by, evidence_submitted, fee_cents, outcome, closed_at, opened_at, last_event_at)
  values (p_stripe_id, p_order, p_charge, p_pi, p_amount, p_currency, p_reason, p_status,
    p_due, p_submitted, p_fee, case when v_closed then p_status end, case when v_closed then p_event_at end, p_opened, p_event_at)
  on conflict (stripe_dispute_id) do update set
    payment_intent_id = coalesce(excluded.payment_intent_id, d.payment_intent_id),
    amount_cents = excluded.amount_cents,
    reason = excluded.reason,
    status = excluded.status,
    evidence_due_by = excluded.evidence_due_by,
    evidence_submitted = d.evidence_submitted or excluded.evidence_submitted,
    fee_cents = excluded.fee_cents,
    outcome = excluded.outcome,
    closed_at = case when excluded.outcome is null then null else coalesce(d.closed_at, excluded.closed_at) end,
    last_event_at = excluded.last_event_at,
    updated_at = now()
  where d.last_event_at <= excluded.last_event_at
  returning d.id into v_id;
  if v_id is null then select id into v_id from disputes where stripe_dispute_id = p_stripe_id; end if;
  return v_id;
end $$;

-- The Customers "Chargeback" tag: which of these customers have a dispute on any order.
create or replace function admin_disputed_customers(p_ids uuid[]) returns table (customer_id uuid)
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct o.customer_id from disputes d join orders o on o.id = d.order_id where o.customer_id = any(p_ids)
$$;

revoke all on function record_dispute(text, uuid, text, text, integer, text, text, text, timestamptz, boolean, integer, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function admin_disputed_customers(uuid[]) from public, anon, authenticated;
grant execute on function record_dispute(text, uuid, text, text, integer, text, text, text, timestamptz, boolean, integer, timestamptz, timestamptz) to service_role;
grant execute on function admin_disputed_customers(uuid[]) to service_role;

-- Early fraud warning choices on the customer's Activity (Customers): who
-- refunded / watched / closed which order's warning (reason = order number).
alter table customer_events drop constraint if exists customer_events_kind_check;
alter table customer_events add constraint customer_events_kind_check check (kind in (
  'blocked', 'unblocked', 'credit_added', 'credit_removed', 'verify_resent',
  'warning_refunded', 'warning_watched', 'warning_closed'));
