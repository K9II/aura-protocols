import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { parseWholesaleSettings, WHOLESALE_TERMS_VERSION, type WholesaleSettings } from "@/lib/wholesale/rules";
import type { UnreviewedOrder } from "@/lib/wholesale/review";

const db = () => getSupabaseAdminClient();
const SETTINGS_COLS = "wholesale_open, wholesale_tiers, wholesale_deposit_pct, wholesale_balance_days, wholesale_run_days, wholesale_lead_days, wholesale_next_cutoff, wholesale_min_kits, wholesale_kit_box_cents";

// Throws on a read error or broken tiers: callers fail closed (the page shows
// the inquiry form, checkout refuses).
export async function getWholesaleSettings(): Promise<WholesaleSettings> {
  const { data, error } = await db().from("shop_settings").select(SETTINGS_COLS).eq("id", true).single();
  if (error || !data) throw new Error(`wholesale settings read failed: ${JSON.stringify(error)}`);
  return parseWholesaleSettings(data as Parameters<typeof parseWholesaleSettings>[0]);
}

// Self-serve: the agreement is recorded first (it is the record of consent),
// then wholesale is switched on unless the owner switched it off. Re-accepting
// keeps the first enabled date.
export async function enableWholesale(customerId: string, ctx: { ipHash: string; userAgent: string | null }): Promise<"enabled" | "disabled"> {
  const { error: e1 } = await db().from("wholesale_agreements").insert({
    customer_id: customerId, terms_version: WHOLESALE_TERMS_VERSION, ip_hash: ctx.ipHash, user_agent: ctx.userAgent?.slice(0, 400) ?? null,
  });
  if (e1) throw new Error(`wholesale agreement insert failed: ${JSON.stringify(e1)}`);
  const { data, error } = await db().from("customers")
    .update({ wholesale_enabled_at: new Date().toISOString() })
    .eq("id", customerId).is("wholesale_enabled_at", null).is("wholesale_disabled_at", null)
    .select("id");
  if (error) throw new Error(`wholesale enable failed: ${JSON.stringify(error)}`);
  if (Array.isArray(data) && data.length === 1) return "enabled";
  // Already had wholesale_enabled_at set (re-accepting keeps the first date)
  // or switched off by the owner — tell which.
  const { data: row, error: e2 } = await db().from("customers")
    .select("wholesale_enabled_at, wholesale_disabled_at").eq("id", customerId).maybeSingle();
  if (e2) throw new Error(`wholesale read failed: ${JSON.stringify(e2)}`);
  return !row || row.wholesale_disabled_at ? "disabled" : "enabled";
}

// Paid deposits from buyers not yet reviewed (spec 2026-10-10). Throws on a read error.
export async function unreviewedBuyers(): Promise<UnreviewedOrder[]> {
  const { data, error } = await db().rpc("admin_unreviewed_wholesale_buyers");
  if (error) throw new Error(`unreviewed wholesale buyers read failed: ${JSON.stringify(error)}`);
  return ((data ?? []) as Array<{ order_id: string; order_number: string; customer_id: string; full_name: string; organization: string | null;
    email: string; research_field: string | null; deposit_cents: number; kits: number; cutoff_on: string }>).map((r) => ({
    orderId: r.order_id, orderNumber: r.order_number, customerId: r.customer_id, name: r.full_name, organization: r.organization,
    email: r.email, field: r.research_field, depositCents: r.deposit_cents, kits: r.kits, cutoffOn: r.cutoff_on,
  }));
}

// Marks the buyer reviewed and logs it in one transaction (SQL). Idempotent.
export async function markWholesaleReviewed(customerId: string, actorId: string): Promise<"ok" | "already" | "missing"> {
  const { data, error } = await db().rpc("admin_mark_wholesale_reviewed", { p_customer: customerId, p_actor: actorId });
  if (error) throw new Error(`wholesale review save failed: ${JSON.stringify(error)}`);
  return data as "ok" | "already" | "missing";
}

export async function saveWholesaleSettings(v: {
  open: boolean; minKits: number; tiers: Array<{ minKits: number; pct: number }>; depositPct: number; balanceDays: number; runDays: number; leadDays: number; nextCutoff: string | null;
}): Promise<void> {
  const { error } = await db().from("shop_settings").update({
    wholesale_open: v.open, wholesale_min_kits: v.minKits, wholesale_tiers: v.tiers, wholesale_deposit_pct: v.depositPct,
    wholesale_balance_days: v.balanceDays, wholesale_run_days: v.runDays, wholesale_lead_days: v.leadDays, wholesale_next_cutoff: v.nextCutoff,
  }).eq("id", true);
  if (error) throw new Error(`wholesale settings save failed: ${JSON.stringify(error)}`);
}
