create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wearable_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('WHOOP','OURA','APPLE','GARMIN','FITBIT','DEXCOM','MANUAL')),
  terra_user_id text,
  connected_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists wearable_connections_user_id_idx on public.wearable_connections(user_id);
create index if not exists wearable_connections_terra_user_id_idx on public.wearable_connections(terra_user_id);

create table if not exists public.biometric_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  captured_at timestamptz not null,
  recovery_score numeric,
  hrv_ms numeric,
  resting_hr_bpm numeric,
  sleep_hours numeric,
  deep_sleep_hours numeric,
  rem_sleep_hours numeric,
  steps integer,
  active_calories numeric,
  glucose_avg_mgdl numeric,
  glucose_variability numeric,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists biometric_snapshots_user_captured_idx on public.biometric_snapshots(user_id, captured_at desc);

create table if not exists public.protocol_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template text not null check (template in ('RECOVERY','GH','SLEEP_STRESS')),
  rules_summary jsonb not null,
  llm_summary jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists protocol_recommendations_user_idx on public.protocol_recommendations(user_id, created_at desc);

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid not null references public.protocol_recommendations(id) on delete cascade,
  thumbs text not null check (thumbs in ('UP','DOWN')),
  free_text text,
  created_at timestamptz not null default now()
);

create index if not exists recommendation_feedback_rec_idx on public.recommendation_feedback(recommendation_id);
