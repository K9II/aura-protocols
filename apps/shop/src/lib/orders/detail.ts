import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getOrderByNumber, type OrderRow } from "@/lib/orders";
import { orderItemLots, type ItemLots } from "@/lib/catalog-ops/data";
import type { CommissionState } from "@/lib/partners/ledger";
import { buildOrderTimeline, type TimelineEntry, type TimelineSources } from "@/lib/orders/timeline";
import type { NoChargeReason } from "@/lib/no-charge/rules";

export type OrderDetail = {
  order: OrderRow;
  lots: Map<string, ItemLots>;
  // paidOrders/spentCents are sales only; noChargeOrders counts paid/shipped no-charge orders.
  customer: { id: string; fullName: string; email: string; verified: boolean; blocked: boolean; paidOrders: number; spentCents: number; noChargeOrders: number };
  noCharge: { reason: NoChargeReason; note: string | null; createdBy: string | null; replaces: string | null } | null;
  code: { id: string; code: string; kind: string; value: number; stack_on_top: boolean; free_shipping: boolean } | null;
  partner: { id: string; code: string } | null;
  commission: { amount_cents: number; rate_pct: number; state: CommissionState; created_at: string; clears_at: string | null; voided_at: string | null } | null;
  flags: { dispute: boolean; warning: boolean };
  timeline: TimelineEntry[];
};

const db = () => getSupabaseAdminClient();
function must<T>(what: string, r: { data: unknown; error: unknown }): T {
  if (r.error) throw new Error(`order ${what} read failed: ${JSON.stringify(r.error)}`);
  return r.data as T;
}

// Everything the owner order page shows, read in parallel. Throws on any
// failed read; null only when the order number doesn't exist.
export async function getOrderDetail(orderNumber: string): Promise<OrderDetail | null> {
  const order = await getOrderByNumber(orderNumber);
  if (!order) return null;
  const items = order.order_items ?? [];
  const isNc = order.kind === "no_charge";
  const none = Promise.resolve({ data: null, error: null });
  const [lots, cust, paid, code, partner, commission, events, disputes, warnings, inquiries, creator, original] = await Promise.all([
    orderItemLots(items.map((i) => i.id)),
    db().from("customers").select("id, full_name, email_verified_at, blocked_at").eq("id", order.customer_id).maybeSingle(),
    db().from("orders").select("total_cents, kind").eq("customer_id", order.customer_id).in("status", ["paid", "shipped"]),
    order.discount_code_id
      ? db().from("discount_codes").select("id, code, kind, value, stack_on_top, free_shipping").eq("id", order.discount_code_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    order.partner_id ? db().from("partners").select("id, code").eq("id", order.partner_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    db().from("commissions").select("amount_cents, rate_pct, state, created_at, clears_at, voided_at").eq("order_id", order.id).maybeSingle(),
    db().from("admin_events").select("action, at, detail, actor:customers(full_name)").eq("target_id", order.id).order("at"),
    db().from("disputes").select("id, status, reason, amount_cents, opened_at, closed_at, outcome").eq("order_id", order.id),
    db().from("early_fraud_warnings").select("id, fraud_type, created_at, resolved_action, resolved_at, resolver:customers!early_fraud_warnings_resolved_by_fkey(full_name)").eq("order_id", order.id),
    db().from("inquiries").select("ref, subject, status, created_at").eq("order_number", order.order_number),
    isNc && order.created_by ? db().from("customers").select("full_name").eq("id", order.created_by).maybeSingle() : none,
    isNc && order.replaces_order_id ? db().from("orders").select("order_number").eq("id", order.replaces_order_id).maybeSingle() : none,
  ]);
  const c = must<{ id: string; full_name: string; email_verified_at: string | null; blocked_at: string | null } | null>("customer", cust);
  const paidRows = must<Array<{ total_cents: number; kind?: "sale" | "no_charge" }> | null>("customer orders", paid) ?? [];
  const sales = paidRows.filter((r) => r.kind !== "no_charge");
  const creatorRow = must<{ full_name: string } | null>("created by", creator);
  const originalRow = must<{ order_number: string } | null>("original order", original);
  const codeRow = must<OrderDetail["code"]>("discount code", code);
  const partnerRow = must<OrderDetail["partner"]>("partner", partner);
  const com = must<OrderDetail["commission"]>("commission", commission);
  const ev = must<Array<{ action: string; at: string; detail: string | null; actor: { full_name: string } | null }> | null>("admin events", events) ?? [];
  const ds = must<TimelineSources["disputes"] | null>("disputes", disputes) ?? [];
  const ws = must<Array<Omit<TimelineSources["warnings"][number], "resolverName"> & { resolver: { full_name: string } | null }> | null>("warnings", warnings) ?? [];
  const iq = must<TimelineSources["inquiries"] | null>("inquiries", inquiries) ?? [];

  return {
    order, lots,
    customer: {
      id: order.customer_id, fullName: c?.full_name ?? order.ship_name, email: order.email,
      verified: !!c?.email_verified_at, blocked: !!c?.blocked_at,
      paidOrders: sales.length, spentCents: sales.reduce((s, r) => s + r.total_cents, 0), noChargeOrders: paidRows.length - sales.length,
    },
    noCharge: isNc
      ? { reason: order.no_charge_reason!, note: order.no_charge_note, createdBy: creatorRow?.full_name ?? null, replaces: originalRow?.order_number ?? null }
      : null,
    code: codeRow, partner: partnerRow, commission: com,
    flags: { dispute: ds.some((d) => !d.closed_at), warning: ws.some((w) => !w.resolved_at) },
    timeline: buildOrderTimeline({
      order,
      adminEvents: ev.map((e) => ({ action: e.action, at: e.at, detail: e.detail, actorName: e.actor?.full_name ?? null })),
      commission: com && partnerRow ? { ...com, partnerCode: partnerRow.code } : null,
      disputes: ds,
      warnings: ws.map(({ resolver, ...w }) => ({ ...w, resolverName: resolver?.full_name ?? null })),
      inquiries: iq,
      noCharge: isNc
        ? { reason: order.no_charge_reason!, replacesNumber: originalRow?.order_number ?? null, note: order.no_charge_note, vials: items.reduce((s, i) => s + i.pack_qty * i.quantity, 0), email: order.email }
        : null,
    }),
  };
}
