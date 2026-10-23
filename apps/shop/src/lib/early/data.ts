import "server-only";
// Early access data: the owner's switch, the EARLY- batch and each waitlister's code,
// and GLOW's live price for the email's checkout card.
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { ensureReferralCode } from "@/lib/waitlist/data";
import { earlyCode, EARLY_PREFIX } from "@/lib/early/token";
import { earlyCodeInput } from "@/lib/early/rules";
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

// The one "EARLY-" batch every personal code belongs to (Discounts lists it).
export async function ensureEarlyBatch(actor: string | null): Promise<string> {
  const found = await db().from("discount_batches").select("id").eq("prefix", EARLY_PREFIX).maybeSingle();
  if (found.error) fail("early batch read", found.error);
  if (found.data) return (found.data as { id: string }).id;
  const { data, error } = await db().from("discount_batches")
    .insert({ prefix: EARLY_PREFIX, size: 1, note: "Early access: one personal code per waitlister (pre-launch email 3)", created_by: actor })
    .select("id").single();
  if (error || !data) fail("early batch insert", error);
  return (data as { id: string }).id;
}

// The batch's size drives its "used up" status in Discounts: kept equal to its codes,
// after each sending run (codes are made one by one as the emails go out).
export async function syncEarlyBatchSize(batchId: string): Promise<number> {
  const { count, error } = await db().from("discount_codes").select("id", { count: "exact", head: true }).eq("batch_id", batchId);
  if (error) fail("early batch count", error);
  const size = Math.max(1, count ?? 0);
  const { error: ue } = await db().from("discount_batches").update({ size }).eq("id", batchId);
  if (ue) fail("early batch size", ue);
  return size;
}

// The person's EARLY-<invite code>, made on first need. Safe to call again: an existing
// code is left exactly as it is.
export async function ensureEarlyCode(email: string, openingOn: string, batchId: string, actor: string | null): Promise<{ ref: string; code: string }> {
  const ref = await ensureReferralCode(email);
  const code = earlyCode(ref);
  const { error } = await db().from("discount_codes")
    .upsert({ ...earlyCodeInput(openingOn, email), code, batch_id: batchId, created_by: actor }, { onConflict: "code", ignoreDuplicates: true });
  if (error) fail(`early code ${code}`, error);
  return { ref, code };
}

// GLOW's live price for the email's checkout card. Throws: the card never shows a made-up price.
export async function earlyPriceCents(): Promise<number> {
  const v = photoVial("glow");
  const live = await getLiveCatalogOrNull();
  const variant = live?.all.find((c) => c.slug === v.slug)?.variants.find((x) => x.strength === v.strength);
  if (!variant) throw new Error(`Early access email: no live price for ${v.name} ${v.strength}`);
  return Math.round(variant.priceUsd * 100);
}
