alter table public.profiles enable row level security;
alter table public.wearable_connections enable row level security;
alter table public.biometric_snapshots enable row level security;
alter table public.protocol_recommendations enable row level security;
alter table public.recommendation_feedback enable row level security;

create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles self upsert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

create policy "wearable_connections self read" on public.wearable_connections
  for select using (auth.uid() = user_id);
create policy "wearable_connections self insert" on public.wearable_connections
  for insert with check (auth.uid() = user_id);
create policy "wearable_connections self update" on public.wearable_connections
  for update using (auth.uid() = user_id);

create policy "biometric_snapshots self read" on public.biometric_snapshots
  for select using (auth.uid() = user_id);
create policy "biometric_snapshots self insert" on public.biometric_snapshots
  for insert with check (auth.uid() = user_id);

create policy "protocol_recommendations self read" on public.protocol_recommendations
  for select using (auth.uid() = user_id);
create policy "protocol_recommendations self insert" on public.protocol_recommendations
  for insert with check (auth.uid() = user_id);

create policy "recommendation_feedback self read" on public.recommendation_feedback
  for select using (auth.uid() = user_id);
create policy "recommendation_feedback self insert" on public.recommendation_feedback
  for insert with check (auth.uid() = user_id);
