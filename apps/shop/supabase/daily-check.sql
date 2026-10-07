-- supabase/daily-check.sql
-- The daily scheduled check (a Claude cloud routine) reads ONE summary of
-- what needs the owner's attention, through a login that can do nothing
-- else: no table access, no writes. The routine emails the owner only when
-- something is due. Mirrors Today's to-do rules (lib/today/*).
-- Run after every other storefront SQL file. Idempotent. The login's
-- password is set separately (never in this file):
--   alter role daily_check password '<secret>';

create schema if not exists ops;
revoke all on schema ops from public, anon, authenticated;

create or replace function ops.daily_check_summary() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with today as (select (now() at time zone 'America/Denver')::date as d),
  paid as (
    select o.order_number, o.paid_at,
      (select count(*) from generate_series((o.paid_at at time zone 'America/Denver')::date + 1, (select d from today), interval '1 day') g
        where extract(isodow from g) < 6)::int as business_days
    from orders o where o.status = 'paid'
  ),
  stock as (
    select v.slug, v.strength, v.low_at, coalesce(sum(s.available) filter (where s.status = 'live'), 0)::int as available
    from catalog_variants v
    join catalog_products p on p.slug = v.slug and p.shown
    left join lot_stock s on s.slug = v.slug and s.variant_id = v.variant_id
    where v.shown and v.archived_at is null
    group by v.slug, v.strength, v.low_at
  )
  select jsonb_build_object(
    'as_of', now(),
    'ship_late_business_days', 2,
    'alerts', (select coalesce(jsonb_agg(jsonb_build_object('title', title, 'count', count, 'last_at', last_at, 'detail', left(split_part(detail, E'\n', 1), 200)) order by last_at desc), '[]'::jsonb)
               from owner_alerts where resolved_at is null),
    'orders_to_ship', (select coalesce(jsonb_agg(jsonb_build_object('order', order_number, 'paid_at', paid_at, 'business_days', business_days) order by paid_at), '[]'::jsonb) from paid),
    'orders_processing', (select count(*) from orders where status = 'processing'),
    'disputes_open', (select coalesce(jsonb_agg(jsonb_build_object('order', o.order_number, 'reason', d.reason, 'amount_cents', d.amount_cents, 'evidence_due_by', d.evidence_due_by, 'draft_saved', d.draft_saved_at is not null) order by d.evidence_due_by nulls last), '[]'::jsonb)
                      from disputes d join orders o on o.id = d.order_id
                      where d.status in ('needs_response', 'warning_needs_response') and not d.evidence_submitted),
    'fraud_warnings_open', (select coalesce(jsonb_agg(jsonb_build_object('order', o.order_number, 'order_status', o.status, 'fraud_type', w.fraud_type, 'created_at', w.created_at) order by w.created_at), '[]'::jsonb)
                            from early_fraud_warnings w join orders o on o.id = w.order_id where w.resolved_at is null),
    'stock_low_or_out', (select coalesce(jsonb_agg(jsonb_build_object('product', slug, 'strength', strength, 'available', available, 'low_at', low_at) order by available, slug), '[]'::jsonb)
                         from stock where available <= low_at),
    'lots_not_live', (select coalesce(jsonb_agg(jsonb_build_object('lot', lot_number, 'product', slug, 'variant', variant_id, 'has_certificate', coa_path is not null, 'received_at', received_at) order by received_at), '[]'::jsonb)
                      from lots where status = 'draft'),
    'payout_run_latest', (select jsonb_build_object('run_date', run_date, 'finished', finished_at is not null, 'error', left(error, 300)) from payout_runs order by run_date desc limit 1),
    'payouts_queued', (select jsonb_build_object('count', count(*), 'cash_cents', coalesce(sum(cash_cents), 0)) from payouts where status = 'queued'),
    'w9s_awaiting_check', (select count(*) from partners where w9_path is not null and w9_checked_at is null and status = 'approved'),
    'partner_applications', (select count(*) from partners where status = 'applied'),
    'inquiries_open', (select jsonb_build_object('count', count(*), 'oldest_waiting_since', min(last_customer_at)) from inquiries where status in ('new', 'needs_reply')),
    'email_run_latest', (select jsonb_build_object('started_at', started_at, 'finished', finished_at is not null, 'failures', failures, 'error', left(error_text, 300)) from email_runs order by started_at desc limit 1),
    'campaigns_stuck_sending', (select count(*) from campaigns where status = 'sending' and updated_at < now() - interval '2 hours')
  )
$$;
revoke all on function ops.daily_check_summary() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'daily_check') then
    create role daily_check login noinherit nocreatedb nocreaterole connection limit 2;
  end if;
end $$;
alter role daily_check set statement_timeout = '15s';
alter role daily_check set default_transaction_read_only = on;
grant usage on schema ops to daily_check;
grant execute on function ops.daily_check_summary() to daily_check;
