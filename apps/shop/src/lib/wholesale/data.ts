import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { parseWholesaleSettings, WHOLESALE_TERMS_VERSION, type WholesaleSettings } from "@/lib/wholesale/rules";

const db = () => getSupabaseAdminClient();
const SETTINGS_COLS = "wholesale_open, wholesale_tiers, wholesale_deposit_pct, wholesale_balance_days, wholesale_run_days, wholesale_lead_days, wholesale_next_cutoff";

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
    .eq("id", customerId).is("wholesale_disabled_at", null)
    .select("id");
  if (error) throw new Error(`wholesale enable failed: ${JSON.stringify(error)}`);
  return Array.isArray(data) && data.length === 1 ? "enabled" : "disabled";
}
