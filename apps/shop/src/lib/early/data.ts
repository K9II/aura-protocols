import "server-only";
// Early access data: the owner's switch and GLOW's live price for the email's checkout card.
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";
import { photoVial } from "@/lib/email/photo-vials";

const db = () => getSupabaseAdminClient();
const fail = (what: string, err: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(err)}`); };

// Read on pre-launch requests that carry the early cookie: cached for a minute per server
// process, so turning it off takes effect within a minute.
const SWITCH_CACHE_MS = 60_000;
let cache: { at: number; open: boolean } | null = null;

export async function earlyAccessOpen(nowMs: number = Date.now()): Promise<boolean> {
  if (cache && nowMs - cache.at < SWITCH_CACHE_MS) return cache.open;
  const { data, error } = await db().from("shop_settings").select("early_access_open").eq("id", true).single();
  if (error || !data) fail("early access switch read", error ?? "no shop_settings row");
  cache = { at: nowMs, open: (data as { early_access_open: boolean }).early_access_open === true };
  return cache.open;
}

// False when the switch was already in that position (a stale page).
export async function setEarlyAccessOpen(open: boolean): Promise<boolean> {
  const { data, error } = await db().from("shop_settings").update({ early_access_open: open, updated_at: new Date().toISOString() })
    .eq("id", true).eq("early_access_open", !open).select("id");
  if (error) fail("early access switch save", error);
  cache = null;
  return Array.isArray(data) && data.length > 0;
}

// GLOW's live price for the email's checkout card. Throws: the card never shows a made-up price.
export async function earlyPriceCents(): Promise<number> {
  const v = photoVial("glow");
  const live = await getLiveCatalogOrNull();
  const variant = live?.all.find((c) => c.slug === v.slug)?.variants.find((x) => x.strength === v.strength);
  if (!variant) throw new Error(`Early access email: no live price for ${v.name} ${v.strength}`);
  return Math.round(variant.priceUsd * 100);
}
