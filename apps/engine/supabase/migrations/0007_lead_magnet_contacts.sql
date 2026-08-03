-- supabase/migrations/0007_lead_magnet_contacts.sql
-- Contacts for the shop app's self-hosted lead-magnet email pipeline
-- (Brevo suspended the account over their peptide-content policy —
-- see apps/shop/docs/lead-magnet-emails.md — so sending now goes through
-- Amazon SES directly, with this table replacing Brevo's contact list.)
create table if not exists public.lead_magnet_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  goal text not null,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  last_sent_at timestamptz
);

alter table public.lead_magnet_contacts enable row level security;
-- No public policies: this table is only ever touched server-side via the
-- service-role key from apps/shop's API routes, which bypasses RLS.
