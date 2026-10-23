-- supabase/waitlist.sql — pre-launch waitlist (2026-10-23). Apply after
-- email.sql and email-admin.sql. Safe to re-run. It replaces the
-- email_sends kind check from email-admin.sql (adds 'waitlist_in') — if
-- email-admin.sql is re-run, re-apply this after it.
--
-- A waitlist sign-up is a subscribers row (source 'waitlist', double opt-in
-- like the Aura letter). On confirm it gets its own invite code; a friend who
-- signs up through that link records it in referred_by. The $10 credit is
-- paid later, on the friend's first shipped order (built before launch).

alter table subscribers add column if not exists waitlist_at timestamptz;
alter table subscribers add column if not exists referral_code text;
alter table subscribers add column if not exists referred_by text;
create unique index if not exists subscribers_referral_code_idx on subscribers (referral_code) where referral_code is not null;
create index if not exists subscribers_referred_by_idx on subscribers (referred_by) where referred_by is not null;

alter table email_sends drop constraint if exists email_sends_kind_check;
alter table email_sends add constraint email_sends_kind_check check (kind in ('confirm','waitlist_in','welcome_1','welcome_2','welcome_3','welcome_4','welcome_5','cart_1','cart_2','cart_3','lot_alert','campaign'));
