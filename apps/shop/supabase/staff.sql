-- Part 9A: admin logins with roles (spec 2026-10-06-admin-staff-logins-design.md).
-- Apply in Aura Store after audit.sql and inquiries.sql. Server-only: RLS on,
-- no policies. v1 roles: owner (Alvester) and assistant (Claude).

create table if not exists staff (
  customer_id  uuid primary key references customers(id) on delete cascade,
  role         text not null check (role in ('owner', 'assistant')),
  status       text not null default 'active' check (status in ('active', 'disabled')),
  added_by     uuid references customers(id) on delete set null,
  added_at     timestamptz not null default now(),
  disabled_by  uuid references customers(id) on delete set null,
  disabled_at  timestamptz,
  disabled_reason text
);
alter table staff enable row level security;
revoke all on staff from anon, authenticated;

-- Every current owner becomes an owner staff row.
insert into staff (customer_id, role, status)
  select id, 'owner', 'active' from customers where is_owner
  on conflict (customer_id) do nothing;

-- customers.is_owner stays true exactly for active owners, so older readers
-- (Customers "Owner" chip, blockRefusal) keep working.
create or replace function sync_is_owner() returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update customers set is_owner = exists (select 1 from staff s where s.customer_id = old.customer_id and s.role = 'owner' and s.status = 'active')
      where id = old.customer_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update customers set is_owner = (new.role = 'owner' and new.status = 'active') where id = new.customer_id;
  end if;
  return null;
end $$;
drop trigger if exists sync_is_owner on staff;
create trigger sync_is_owner after insert or update or delete on staff
  for each row execute function sync_is_owner();

-- Disable / enable a login. 'ok' | 'missing' | 'self' | 'last_owner' | 'unchanged'.
create or replace function admin_set_staff_status(p_target uuid, p_status text, p_actor uuid, p_reason text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v staff%rowtype;
begin
  if p_status not in ('active', 'disabled') then raise exception 'bad_status'; end if;
  perform pg_advisory_xact_lock(hashtext('staff_status'));
  select * into v from staff where customer_id = p_target for update;
  if not found then return 'missing'; end if;
  if p_target = p_actor then return 'self'; end if;
  if v.status = p_status then return 'unchanged'; end if;
  if p_status = 'disabled' and v.role = 'owner'
     and (select count(*) from staff where role = 'owner' and status = 'active') <= 1 then return 'last_owner'; end if;
  update staff set status = p_status,
    disabled_by = case when p_status = 'disabled' then p_actor end,
    disabled_at = case when p_status = 'disabled' then now() end,
    disabled_reason = case when p_status = 'disabled' then nullif(trim(p_reason), '') end
    where customer_id = p_target;
  return 'ok';
end $$;

-- Sign out everywhere: ends every Supabase session (refresh tokens go with them).
-- Returns how many sessions were ended.
create or replace function admin_end_sessions(p_user uuid) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  delete from auth.sessions where user_id = p_user;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function admin_set_staff_status(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function admin_end_sessions(uuid) from public, anon, authenticated;
grant execute on function admin_set_staff_status(uuid, text, uuid, text) to service_role;
grant execute on function admin_end_sessions(uuid) to service_role;

-- Activity: a Team area.
alter table admin_events drop constraint if exists admin_events_area_check;
alter table admin_events add constraint admin_events_area_check check (area in ('orders', 'partners', 'payouts', 'today', 'staff'));
alter table admin_events drop constraint if exists admin_events_action_check;
alter table admin_events add constraint admin_events_action_check check (action in (
  'order_shipped', 'order_refunded',
  'partner_approved', 'partner_declined', 'partner_suspended', 'partner_reinstated',
  'payout_paid', 'w9_opened', 'w9_checked',
  'inquiries_seen',
  'staff_disabled', 'staff_enabled', 'staff_signed_out'));

-- Inquiry reply drafts (one per inquiry; the latest save wins).
alter table inquiries add column if not exists draft_body text;
alter table inquiries add column if not exists draft_by uuid references customers(id) on delete set null;
alter table inquiries add column if not exists draft_at timestamptz;
alter table inquiry_events drop constraint if exists inquiry_events_action_check;
alter table inquiry_events add constraint inquiry_events_action_check check (action in (
  'created', 'opened', 'replied', 'closed', 'reopened', 'auto_closed', 'customer_replied',
  'topic_changed', 'linked', 'unlinked', 'bounced',
  'reply_saved', 'reply_deleted', 'unmatched_dismissed', 'unmatched_attached',
  'draft_saved', 'draft_discarded'));
