import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { SalesSummary } from "@/lib/today/numbers";
import type { Range } from "@/lib/today/periods";

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };
const num = (v: unknown) => Number(v ?? 0);

type RawSummary = Record<string, unknown> & {
  buckets?: Array<{ at: string; cents: unknown }>;
  top?: Array<{ name: string; strength: string; vials: unknown; cents: unknown }>;
};

// One period of the Numbers card (admin_sales_summary in today.sql).
export async function salesSummary(r: Range, bucket: "hour" | "day"): Promise<SalesSummary> {
  const { data, error } = await db().rpc("admin_sales_summary", { p_from: r.from, p_to: r.to, p_bucket: bucket });
  if (error || data == null) fail("admin_sales_summary", error ?? "no data");
  const d = data as RawSummary;
  return {
    salesCents: num(d.sales_cents), orders: num(d.orders), chargedCents: num(d.charged_cents), shippingCents: num(d.shipping_cents),
    taxCents: num(d.tax_cents), refundedCents: num(d.refunded_cents), refundedOrders: num(d.refunded_orders),
    firstTimeOrders: num(d.first_time_orders), repeatOrders: num(d.repeat_orders), newAccounts: num(d.new_accounts),
    buckets: (d.buckets ?? []).map((b) => ({ at: b.at, cents: num(b.cents) })),
    top: (d.top ?? []).map((t) => ({ name: t.name, strength: t.strength, vials: num(t.vials), cents: num(t.cents) })),
  };
}
