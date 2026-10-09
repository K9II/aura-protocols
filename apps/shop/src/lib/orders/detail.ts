import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getOrderByNumber, type OrderRow } from "@/lib/orders";
import { orderItemLots, type ItemLots } from "@/lib/catalog-ops/data";
import type { CommissionState } from "@/lib/partners/ledger";
import { buildOrderTimeline, type TimelineEntry, type TimelineSources } from "@/lib/orders/timeline";
import type { NoChargeReason } from "@/lib/no-charge/rules";
import type { RefundFlags } from "@/lib/refunds/rules";

export type OrderDetail = {
  order: OrderRow;
  lots: Map<string, ItemLots>;
  // paidOrders/spentCents are paid/shipped sales; noChargeOrders counts paid/shipped
  // no-charge orders; refundedOrders counts refunded sales.
  customer: { id: string; fullName: string; email: string; verified: boolean; blocked: boolean; paidOrders: number; spentCents: number; noChargeOrders: number; refundedOrders: number };
  noCharge: { reason: NoChargeReason; note: string | null; createdBy: string | null; replaces: string | null } | null;
  code: { id: string; code: string; kind: string; value: number; stack_on_top: boolean; free_shipping: boolean } | null;
  partner: { id: string; code: string } | null;
  commission: { amount_cents: number; rate_pct: number; state: CommissionState; created_at: string; clears_at: string | null; voided_at: string | null } | null;
  flags: RefundFlags;
  // The open chargeback's id (its Disputes page), if any.
  openDisputeId: string | null;
  // Who refunded it here (orders.refunded_by); null for a Stripe-dashboard refund.
  refundedBy: string | null;
  // A wholesale order's production run (by its order-by date), if one exists.
  run: { id: string; number: string } | null;
  timeline: TimelineEntry[];
};

const db = () => getSupabaseAdminClient();
function must<T>(what: string, r: { data: unknown; error: unknown }): T {
  if (r.error) throw new Error(`order ${what} read failed: ${JSON.stringify(r.error)}`);
  return r.data as T;
}

// An open chargeback (not closed) or an unresolved early fraud warning. Those
// orders are refunded from Disputes, never from the order page. A lost
// chargeback means the bank already returned the money: no refund at all.
export function flagsFrom(disputes: Array<{ closed_at: string | null; outcome?: string | null }>, warnings: Array<{ resolved_at: string | null }>): RefundFlags {
  return { dispute: disputes.some((d) => !d.closed_at), warning: warnings.some((w) => !w.resolved_at), lostDispute: disputes.some((d) => d.outcome === "lost") };
}

// The same flags for one order, read on their own (the refund action).
export async function orderFlags(orderId: string): Promise<RefundFlags> {
  const [disputes, warnings] = await Promise.all([
    db().from("disputes").select("closed_at, outcome").eq("order_id", orderId),
    db().from("early_fraud_warnings").select("resolved_at").eq("order_id", orderId),
  ]);
  return flagsFrom(
    must<Array<{ closed_at: string | null; outcome: string | null }> | null>("disputes", disputes) ?? [],
    must<Array<{ resolved_at: string | null }> | null>("warnings", warnings) ?? [],
  );
}

// Everything the owner order page shows, read in parallel. Throws on any
// failed read; null only when the order number doesn't exist.
export async function getOrderDetail(orderNumber: string): Promise<OrderDetail | null> {
  const order = await getOrderByNumber(orderNumber);
  if (!order) return null;
  const items = order.order_items ?? [];
  const isNc = order.kind === "no_charge";
  const none = Promise.resolve({ data: null, error: null });
  const isWs = order.channel === "wholesale";
  const [lots, cust, paid, code, partner, commission, events, disputes, warnings, inquiries, creator, original, refunder, runRes, runEv] = await Promise.all([
    orderItemLots(items.map((i) => i.id)),
    db().from("customers").select("id, full_name, email_verified_at, blocked_at").eq("id", order.customer_id).maybeSingle(),
    db().from("orders").select("total_cents, kind, status").eq("customer_id", order.customer_id).in("status", ["paid", "shipped", "refunded"]),
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
    order.refunded_by ? db().from("customers").select("full_name").eq("id", order.refunded_by).maybeSingle() : none,
    isWs && order.wholesale_cutoff_on ? db().from("production_runs").select("id, number").eq("cutoff_on", order.wholesale_cutoff_on).maybeSingle() : none,
    isWs ? db().from("production_run_events").select("kind, created_at, detail").eq("order_id", order.id).order("created_at") : none,
  ]);
  const run = must<{ id: string; number: string } | null>("production run", runRes);
  const runEvents = (must<Array<{ kind: string; created_at: string; detail: string | null }> | null>("run events", runEv) ?? [])
    .map((e) => ({ kind: e.kind, at: e.created_at, detail: e.detail }));
  const c = must<{ id: string; full_name: string; email_verified_at: string | null; blocked_at: string | null } | null>("customer", cust);
  const custRows = must<Array<{ total_cents: number; kind?: "sale" | "no_charge"; status?: string }> | null>("customer orders", paid) ?? [];
  const paidRows = custRows.filter((r) => r.status !== "refunded");
  const sales = paidRows.filter((r) => r.kind !== "no_charge");
  const refundedSales = custRows.filter((r) => r.status === "refunded" && r.kind !== "no_charge").length;
  const creatorRow = must<{ full_name: string } | null>("created by", creator);
  const originalRow = must<{ order_number: string } | null>("original order", original);
  const refunderRow = must<{ full_name: string } | null>("refunded by", refunder);
  const vials = items.reduce((s, i) => s + i.pack_qty * i.quantity, 0);
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
      paidOrders: sales.length, spentCents: sales.reduce((s, r) => s + r.total_cents, 0), noChargeOrders: paidRows.length - sales.length, refundedOrders: refundedSales,
    },
    noCharge: isNc
      ? { reason: order.no_charge_reason!, note: order.no_charge_note, createdBy: creatorRow?.full_name ?? null, replaces: originalRow?.order_number ?? null }
      : null,
    code: codeRow, partner: partnerRow, commission: com,
    flags: flagsFrom(ds, ws),
    openDisputeId: ds.find((x) => !x.closed_at)?.id ?? null,
    refundedBy: refunderRow?.full_name ?? null,
    run,
    timeline: buildOrderTimeline({
      order,
      adminEvents: ev.map((e) => ({ action: e.action, at: e.at, detail: e.detail, actorName: e.actor?.full_name ?? null })),
      commission: com && partnerRow ? { ...com, partnerCode: partnerRow.code } : null,
      disputes: ds,
      warnings: ws.map(({ resolver, ...w }) => ({ ...w, resolverName: resolver?.full_name ?? null })),
      inquiries: iq,
      noCharge: isNc
        ? { reason: order.no_charge_reason!, replacesNumber: originalRow?.order_number ?? null, note: order.no_charge_note, vials, email: order.email }
        : null,
      refund: { byName: refunderRow?.full_name ?? null, vials },
      wholesale: isWs ? { run, events: runEvents } : null,
    }),
  };
}
