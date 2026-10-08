import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { parseWholesaleSettings, WHOLESALE_TERMS_VERSION, type WholesaleSettings } from "@/lib/wholesale/rules";

const db = () => getSupabaseAdminClient();
const SETTINGS_COLS = "wholesale_open, wholesale_tiers, wholesale_deposit_pct, wholesale_balance_days, wholesale_run_days, wholesale_lead_days, wholesale_next_cutoff, wholesale_min_kits";

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
