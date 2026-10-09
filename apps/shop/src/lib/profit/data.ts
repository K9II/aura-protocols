import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { toProfitRow, type ProfitRow } from "@/lib/profit/rules";

const db = () => getSupabaseAdminClient();
const fail = (what: string, e: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(e)}`); };

// One order's profit (any status; the page decides when to show it).
export async function orderProfit(orderId: string): Promise<ProfitRow | null> {
  const { data, error } = await db().rpc("order_profit_rows", { p_from: null, p_to: null, p_order: orderId });
  if (error) fail("order_profit_rows", error);
  const row = (data as Array<Record<string, unknown>> | null)?.[0];
  return row ? toProfitRow(row) : null;
}

export type ProfitSummary = { orders: number; goodsCents: number; costCents: number; profitCents: number; uncostedOrders: number; feesEstimated: number };

// Today: profit of the sales paid in [from, to) (admin_profit_summary).
export async function profitSummary(r: { from: string; to: string }): Promise<ProfitSummary> {
  const { data, error } = await db().rpc("admin_profit_summary", { p_from: r.from, p_to: r.to });
  if (error || data == null) fail("admin_profit_summary", error ?? "no data");
  const d = data as Record<string, unknown>;
  const n = (v: unknown) => Number(v ?? 0);
  return { orders: n(d.orders), goodsCents: n(d.goods_cents), costCents: n(d.cost_cents), profitCents: n(d.profit_cents), uncostedOrders: n(d.uncosted_orders), feesEstimated: n(d.fees_estimated) };
}
