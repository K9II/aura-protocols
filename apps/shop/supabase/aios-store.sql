-- AIOS → Aura Shop → Store tab: the owner shows/hides a product or strength
-- and adds a strength from AIOS. Each lands here the same way the matching
-- Admin → Catalog action does (same row update, same catalog event kind),
-- with the note "Sent from AIOS". Prices go through admin_set_variant_price
-- (aios-price.sql). Apply after catalog-ops.sql, staff.sql, coa-library.sql
-- and aios-price.sql. Server-only (service role). Safe to re-run.
--
-- p_expected is what AIOS showed; if the store moved since (an Admin edit
-- AIOS hasn't read), nothing changes → 'changed'. The actor is the one active
-- owner (AIOS is the owner's tool); none or more than one → 'no_owner'.

create or replace function aios_owner() returns uuid language sql stable
set search_path = public, pg_temp as $$
  select case when count(*) = 1 then min(customer_id::text)::uuid end from staff where role = 'owner' and status = 'active';
$$;
revoke all on function aios_owner() from public, anon, authenticated;

-- Returns 'ok' | 'same' | 'missing' | 'changed' | 'no_owner'.
create or replace function admin_set_product_shown(p_slug text, p_expected boolean, p_shown boolean, p_note text)
returns text language plpgsql set search_path = public, pg_temp as $$
declare
  v_owner uuid := aios_owner();
  v_now boolean;
begin
  if v_owner is null then return 'no_owner'; end if;
  if p_shown is null or p_expected is null then return 'missing'; end if;
  select shown into v_now from catalog_products where slug = p_slug for update;
  if not found then return 'missing'; end if;
  if v_now = p_shown then return 'same'; end if;
  if v_now <> p_expected then return 'changed'; end if;
  update catalog_products set shown = p_shown, updated_at = now() where slug = p_slug;
  insert into catalog_events (slug, kind, note, actor_id)
    values (p_slug, case when p_shown then 'shown' else 'hidden' end, p_note, v_owner);
  return 'ok';
end $$;
revoke all on function admin_set_product_shown(text, boolean, boolean, text) from public, anon, authenticated;

-- Returns 'ok' | 'same' | 'missing' | 'archived' | 'changed' | 'no_owner'.
create or replace function admin_set_variant_shown(p_slug text, p_variant text, p_expected boolean, p_shown boolean, p_note text)
returns text language plpgsql set search_path = public, pg_temp as $$
declare
  v_owner uuid := aios_owner();
  v catalog_variants%rowtype;
begin
  if v_owner is null then return 'no_owner'; end if;
  if p_shown is null or p_expected is null then return 'missing'; end if;
  select * into v from catalog_variants where slug = p_slug and variant_id = p_variant for update;
  if not found then return 'missing'; end if;
  if v.archived_at is not null then return 'archived'; end if;
  if v.shown = p_shown then return 'same'; end if;
  if v.shown <> p_expected then return 'changed'; end if;
  update catalog_variants set shown = p_shown, updated_at = now() where slug = p_slug and variant_id = p_variant;
  insert into catalog_events (slug, variant_id, kind, after, note, actor_id)
    values (p_slug, p_variant, case when p_shown then 'strength_shown' else 'strength_hidden' end,
            json_build_object('strength', v.strength), p_note, v_owner);
  return 'ok';
end $$;
revoke all on function admin_set_variant_shown(text, text, boolean, boolean, text) from public, anon, authenticated;

-- A new strength starts hidden (like Admin → Catalog → Add strength). The
-- store id is derived here from the label ("30 mg" → "30mg"), never sent.
-- An archived strength with the same id is reported (restore it in Admin).
-- Returns 'ok' | 'missing' (no such product) | 'taken' | 'archived' |
-- 'sku_taken' | 'bad_strength' | 'bad_price' | 'bad_low' | 'bad_sku' | 'no_owner'.
create or replace function admin_add_variant(p_slug text, p_strength text, p_price_cents integer, p_low_at integer,
  p_sku text, p_note text) returns text language plpgsql set search_path = public, pg_temp as $$
declare
  v_owner uuid := aios_owner();
  v_id text;
  v_archived timestamptz;
begin
  if v_owner is null then return 'no_owner'; end if;
  if p_strength is null or p_strength !~ '^[0-9]+(\.[0-9]+)? (mg|mcg|IU)$' then return 'bad_strength'; end if;
  if p_price_cents is null or p_price_cents <= 0 or p_price_cents > 10000000 then return 'bad_price'; end if;
  if p_low_at is null or p_low_at < 0 or p_low_at > 10000 then return 'bad_low'; end if;
  if p_sku is not null and p_sku !~ '^[A-Z0-9][A-Z0-9-]{1,39}$' then return 'bad_sku'; end if;
  perform 1 from catalog_products where slug = p_slug for update;
  if not found then return 'missing'; end if;
  v_id := lower(replace(p_strength, ' ', ''));
  select archived_at into v_archived from catalog_variants where slug = p_slug and variant_id = v_id;
  if found then return case when v_archived is not null then 'archived' else 'taken' end; end if;
  if p_sku is not null and exists (select 1 from catalog_variants where threepl_sku = p_sku) then return 'sku_taken'; end if;
  insert into catalog_variants (slug, variant_id, strength, price_cents, low_at, threepl_sku, shown)
    values (p_slug, v_id, p_strength, p_price_cents, p_low_at, p_sku, false);
  insert into catalog_events (slug, variant_id, kind, after, note, actor_id)
    values (p_slug, v_id, 'strength_added',
            json_build_object('strength', p_strength, 'price_cents', p_price_cents, 'shown', false), p_note, v_owner);
  return 'ok';
end $$;
revoke all on function admin_add_variant(text, text, integer, integer, text, text) from public, anon, authenticated;
