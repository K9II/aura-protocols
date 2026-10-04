import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { OrderRow } from "@/lib/orders";

// Orders still awaiting payment, 1–23 h old, that are their customer's
// newest order (a newer checkout replaces an older one).
export async function listAbandonedCheckouts(nowMs: number = Date.now()): Promise<OrderRow[]> {
  const db = getSupabaseAdminClient();
  const { data, error } = await db.from("orders").select("*, order_items(*)")
    .eq("status", "awaiting_payment")
    .lte("created_at", new Date(nowMs - 3600 * 1000).toISOString())
    .gte("created_at", new Date(nowMs - 23 * 3600 * 1000).toISOString());
  if (error) throw new Error(`abandoned checkout query failed: ${JSON.stringify(error)}`);
  const out: OrderRow[] = [];
  for (const o of (data ?? []) as OrderRow[]) {
    const { count, error: e2 } = await db.from("orders").select("id", { count: "exact", head: true })
      .eq("customer_id", o.customer_id).gt("created_at", o.created_at);
    if (e2) throw new Error(`newer order check failed: ${JSON.stringify(e2)}`);
    if ((count ?? 0) === 0) out.push(o);
  }
  return out;
}
