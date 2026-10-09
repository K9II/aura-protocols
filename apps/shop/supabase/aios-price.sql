-- AIOS "Send to store": the owner changes a retail price from AIOS → Aura
-- Shop → Economics, and it lands here the same way an Admin → Catalog price
-- edit does (catalog_variants.price_cents + a price_changed catalog event).
-- Apply after catalog-ops.sql and staff.sql. Server-only (service role).
--
-- p_expected_cents is the price AIOS showed; if the store's price has moved
-- since (a Catalog edit the AIOS hasn't synced), nothing changes → 'changed'.
-- The actor is the one active owner (AIOS is the owner's tool); none or more
-- than one → 'no_owner'.
-- Returns 'ok' | 'same' | 'missing' | 'archived' | 'changed' | 'no_owner' | 'bad_price'.
create or replace function admin_set_variant_price(p_slug text, p_variant text, p_expected_cents integer,
  p_price_cents integer, p_note text) returns text language plpgsql
set search_path = public, pg_temp as $$
declare
  v catalog_variants%rowtype;
  v_owner uuid;
  v_owners integer;
begin
  if p_price_cents is null or p_price_cents <= 0 or p_price_cents > 10000000 then return 'bad_price'; end if;
  select count(*), min(customer_id::text)::uuid into v_owners, v_owner from staff where role = 'owner' and status = 'active';
  if v_owners <> 1 then return 'no_owner'; end if;
  select * into v from catalog_variants where slug = p_slug and variant_id = p_variant for update;
  if not found then return 'missing'; end if;
  if v.archived_at is not null then return 'archived'; end if;
  if v.price_cents = p_price_cents then return 'same'; end if;
  if v.price_cents <> p_expected_cents then return 'changed'; end if;
  update catalog_variants set price_cents = p_price_cents, updated_at = now() where slug = p_slug and variant_id = p_variant;
  insert into catalog_events (slug, variant_id, kind, before, after, note, actor_id)
    values (p_slug, p_variant, 'price_changed', json_build_object('price_cents', v.price_cents),
            json_build_object('price_cents', p_price_cents), p_note, v_owner);
  return 'ok';
end $$;
revoke all on function admin_set_variant_price(text, text, integer, integer, text) from public, anon, authenticated;
