import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getOrderById } from "@/lib/orders";
import { orderItemLots } from "@/lib/catalog-ops/data";
import { coaPublicUrl } from "@/lib/catalog-live";
import { siteUrl } from "@/lib/supabase/env";
import type { Agreement } from "@/lib/customers/data";
import type { OrderStatus } from "@/lib/order-status";
import type { EvidenceDraft } from "@/lib/disputes/fields";
import type { EvidenceFacts, FileField } from "@/lib/disputes/evidence";
import type { ChargeInfo, DisputeParams, WarningParams } from "@/lib/disputes/stripe-map";
import { DISPUTES_LIST_MAX } from "@/lib/disputes/constants";
import {
  OPEN_STATUSES, type DisputeAction, type DisputeEventRow, type DisputeListRow, type DisputeRow, type OrderBrief,
  type WarningAction, type WarningListRow, type WarningRow,
} from "@/lib/disputes/rules";

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };

// ---------- webhook writes (lib/stripe-events.ts) ----------

// Insert or refresh (record_dispute, disputes.sql); returns our id.
export async function recordDispute(p: DisputeParams): Promise<string> {
  const { data, error } = await db().rpc("record_dispute", p);
  if (error || !data) return fail("record_dispute", error ?? "no id");
  return data as string;
}

export async function recordDisputeCard(id: string, c: ChargeInfo): Promise<void> {
  const { error } = await db().from("disputes").update({ card_brand: c.cardBrand, card_last4: c.cardLast4, billing_address: c.billingAddress }).eq("id", id);
  if (error) fail("dispute card update", error);
}

// Set once: a replayed funds event keeps the first time.
export async function recordFunds(id: string, kind: "withdrawn" | "reinstated", at: string): Promise<void> {
  const col = kind === "withdrawn" ? "funds_withdrawn_at" : "funds_reinstated_at";
  const { error } = await db().from("disputes").update({ [col]: at }).eq("id", id).is(col, null);
  if (error) fail("dispute funds update", error);
}

// An entry with a key is written once, however often the event is replayed.
export async function logDisputeEvent(e: { disputeId: string; action: DisputeAction; actor?: string | null; note?: string | null; key?: string | null }): Promise<void> {
  const row = { dispute_id: e.disputeId, action: e.action, actor: e.actor ?? null, note: e.note ?? null, event_key: e.key ?? null };
  const { error } = e.key
    ? await db().from("dispute_events").upsert(row, { onConflict: "event_key", ignoreDuplicates: true })
    : await db().from("dispute_events").insert(row);
  if (error) fail("dispute event insert", error);
}

// Insert or refresh a warning; how it was resolved is never touched here.
export async function recordWarning(w: WarningParams): Promise<void> {
  const { error } = await db().from("early_fraud_warnings").upsert(w, { onConflict: "stripe_efw_id" });
  if (error) fail("early fraud warning upsert", error);
}

// A chargeback on the same charge closes its open warning.
export async function resolveWarningsForCharge(chargeId: string): Promise<void> {
  const { error } = await db().from("early_fraud_warnings").update({ resolved_action: "disputed", resolved_at: new Date().toISOString() })
    .eq("charge_id", chargeId).is("resolved_at", null);
  if (error) fail("early fraud warning resolve", error);
}

// Whether a chargeback already exists on this charge (a warning arriving
// after its dispute: close it immediately instead of leaving a refund button).
export async function hasDisputeForCharge(chargeId: string): Promise<boolean> {
  const { count, error } = await db().from("disputes").select("id", { count: "exact", head: true }).eq("charge_id", chargeId);
  if (error) fail("dispute by charge read", error);
  return (count ?? 0) > 0;
}

// ---------- lists ----------

const ORDER_BRIEF = "order_number, status, email, customer_id, shipped_at, paid_at, total_cents, store_credit_cents, customers(full_name)";
type RawOrder = {
  order_number: string; status: OrderStatus; email: string; customer_id: string; shipped_at: string | null; paid_at: string | null;
  total_cents: number; store_credit_cents: number; customers: { full_name: string } | null;
};
const brief = (o: RawOrder | null): OrderBrief => (o
  ? {
    number: o.order_number, status: o.status, email: o.email, customerId: o.customer_id, customerName: o.customers?.full_name ?? "",
    shippedAt: o.shipped_at, paidAt: o.paid_at, totalCents: o.total_cents, creditCents: o.store_credit_cents,
  }
  : fail("dispute order embed", "missing order"));
const toDispute = ({ orders, ...r }: DisputeRow & { orders: RawOrder | null }): DisputeListRow => ({ ...r, order: brief(orders) });
const toWarning = ({ orders, ...r }: WarningRow & { orders: RawOrder | null }): WarningListRow => ({ ...r, order: brief(orders) });

export async function listDisputes(): Promise<DisputeListRow[]> {
  const { data, error } = await db().from("disputes").select(`*, orders(${ORDER_BRIEF})`).order("created_at", { ascending: false }).limit(DISPUTES_LIST_MAX);
  if (error) fail("disputes read", error);
  return ((data ?? []) as unknown as Array<DisputeRow & { orders: RawOrder | null }>).map(toDispute);
}

export async function listWarnings(): Promise<WarningListRow[]> {
  const { data, error } = await db().from("early_fraud_warnings").select(`*, orders(${ORDER_BRIEF})`).order("created_at", { ascending: false }).limit(DISPUTES_LIST_MAX);
  if (error) fail("early fraud warnings read", error);
  return ((data ?? []) as unknown as Array<WarningRow & { orders: RawOrder | null }>).map(toWarning);
}

// Chargebacks still waiting for evidence, soonest deadline first (Today, reminders).
export async function openDisputes(): Promise<DisputeListRow[]> {
  const { data, error } = await db().from("disputes").select(`*, orders(${ORDER_BRIEF})`)
    .in("status", [...OPEN_STATUSES]).eq("evidence_submitted", false).order("evidence_due_by", { ascending: true });
  if (error) fail("open disputes read", error);
  return ((data ?? []) as unknown as Array<DisputeRow & { orders: RawOrder | null }>).map(toDispute);
}

async function openWarnings(): Promise<WarningListRow[]> {
  const { data, error } = await db().from("early_fraud_warnings").select(`*, orders(${ORDER_BRIEF})`).is("resolved_at", null).order("created_at", { ascending: true });
  if (error) fail("open early fraud warnings read", error);
  return ((data ?? []) as unknown as Array<WarningRow & { orders: RawOrder | null }>).map(toWarning);
}

export async function openDisputeTodos(): Promise<{ disputes: DisputeListRow[]; warnings: WarningListRow[] }> {
  const [disputes, warnings] = await Promise.all([openDisputes(), openWarnings()]);
  return { disputes, warnings };
}

// ---------- counts ----------

async function countOpenDisputes(): Promise<number> {
  const { count, error } = await db().from("disputes").select("id", { count: "exact", head: true }).in("status", [...OPEN_STATUSES]).eq("evidence_submitted", false);
  if (error) fail("open disputes count", error);
  return count ?? 0;
}
async function countOpenWarnings(): Promise<number> {
  const { count, error } = await db().from("early_fraud_warnings").select("id", { count: "exact", head: true }).is("resolved_at", null);
  if (error) fail("open early fraud warnings count", error);
  return count ?? 0;
}

// The Disputes nav badge. Cosmetic: a failure logs and shows no badge rather
// than breaking every admin page (e.g. before disputes.sql is applied).
export async function disputesNavCount(): Promise<number> {
  try {
    const [d, w] = await Promise.all([countOpenDisputes(), countOpenWarnings()]);
    return d + w;
  } catch (err) {
    console.error("disputes nav count failed:", err);
    return 0;
  }
}

// Excludes warning_* statuses: those are Stripe inquiries (early-warning-style,
// answered the same way but never a real chargeback), not chargebacks, so
// they shouldn't count toward the dispute rate.
async function countDisputesSince(since: string): Promise<number> {
  const { count, error } = await db().from("disputes").select("id", { count: "exact", head: true }).gte("opened_at", since).not("status", "like", "warning_%");
  if (error) fail("dispute rate disputes count", error);
  return count ?? 0;
}
// Orders paid through Stripe since `since`. The order data doesn't record
// payment method type, so this counts every Stripe payment (card, wallet,
// ACH) rather than card charges alone — the UI says "payments", not "card
// charges", for the same reason.
async function countPaymentsSince(since: string): Promise<number> {
  const { count, error } = await db().from("orders").select("id", { count: "exact", head: true }).gte("paid_at", since).not("stripe_payment_intent", "is", null);
  if (error) fail("dispute rate payments count", error);
  return count ?? 0;
}
// Disputes opened, and orders paid through Stripe, since `since`.
export async function disputeRateCounts(since: string): Promise<{ disputes: number; charges: number }> {
  const [disputes, charges] = await Promise.all([countDisputesSince(since), countPaymentsSince(since)]);
  return { disputes, charges };
}

// The Customers "Chargeback" tag (admin_disputed_customers, disputes.sql).
// Cosmetic, like disputesNavCount: a failure (e.g. before disputes.sql is
// applied) logs and tags nobody, rather than breaking the Customers pages.
export async function customersWithDisputes(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  try {
    const { data, error } = await db().rpc("admin_disputed_customers", { p_ids: ids });
    if (error) throw new Error(JSON.stringify(error));
    return new Set(((data ?? []) as Array<{ customer_id: string }>).map((r) => r.customer_id));
  } catch (err) {
    console.error("disputed customers read failed:", err);
    return new Set();
  }
}

// ---------- one chargeback ----------

export async function getDisputeRow(id: string): Promise<DisputeRow | null> {
  const { data, error } = await db().from("disputes").select("*").eq("id", id).maybeSingle();
  if (error) fail("dispute read", error);
  return (data as DisputeRow | null) ?? null;
}

type CustomerFacts = { full_name: string; created_at: string; is_owner: boolean; blocked_at: string | null };
async function customerRow(id: string): Promise<CustomerFacts> {
  const { data, error } = await db().from("customers").select("full_name, created_at, is_owner, blocked_at").eq("id", id).maybeSingle();
  if (error || !data) return fail("dispute customer read", error ?? `customer ${id} not found`);
  return data as CustomerFacts;
}

// A deleted auth user shouldn't block the chargeback page from loading: fall
// back to the order's own email (a real Supabase error still throws).
async function authUser(id: string, fallbackEmail: string): Promise<{ email: string; lastSignInAt: string | null }> {
  const { data, error } = await db().auth.admin.getUserById(id);
  if (error) return fail("dispute customer email read", error);
  return { email: data?.user?.email ?? fallbackEmail, lastSignInAt: data?.user?.last_sign_in_at ?? null };
}

async function latestAgreement(customerId: string): Promise<Agreement | null> {
  const { data, error } = await db().from("account_agreements").select("*").eq("customer_id", customerId).order("agreed_at", { ascending: false }).limit(1).maybeSingle();
  if (error) fail("dispute agreement read", error);
  return (data as Agreement | null) ?? null;
}

type CustomerOrder = { id: string; order_number: string; status: OrderStatus; total_cents: number; paid_at: string | null; created_at: string };
async function customerOrders(customerId: string): Promise<CustomerOrder[]> {
  const { data, error } = await db().from("orders").select("id, order_number, status, total_cents, paid_at, created_at").eq("customer_id", customerId).order("created_at", { ascending: true });
  if (error) fail("dispute customer orders read", error);
  return (data as CustomerOrder[] | null) ?? [];
}

async function disputeEvents(id: string): Promise<DisputeEventRow[]> {
  const { data, error } = await db().from("dispute_events").select("id, action, note, at, customers(full_name)").eq("dispute_id", id).order("at", { ascending: false });
  if (error) fail("dispute events read", error);
  type Raw = { id: string; action: DisputeAction; note: string | null; at: string; customers: { full_name: string } | null };
  return ((data ?? []) as unknown as Raw[]).map((e) => ({ id: e.id, action: e.action, note: e.note, at: e.at, actorName: e.customers?.full_name.split(" ")[0] ?? null }));
}

async function disputedOrderIds(orderIds: string[]): Promise<Set<string>> {
  if (!orderIds.length) return new Set();
  const { data, error } = await db().from("disputes").select("order_id").in("order_id", orderIds);
  if (error) fail("customer disputes read", error);
  return new Set(((data ?? []) as Array<{ order_id: string }>).map((r) => r.order_id));
}

type LotFacts = { lot_number: string; purity_pct: number | string; method: string; coa_path: string | null };
async function lotDetails(numbers: string[]): Promise<Map<string, LotFacts>> {
  if (!numbers.length) return new Map();
  const { data, error } = await db().from("lots").select("lot_number, purity_pct, method, coa_path").in("lot_number", numbers);
  if (error) fail("dispute lots read", error);
  return new Map(((data ?? []) as LotFacts[]).map((l) => [l.lot_number, l]));
}

// Shipped lots when recorded, else the lots held for the line.
async function itemLots(itemIds: string[]): Promise<Map<string, Array<{ lotNumber: string; qty: number }>>> {
  const m = await orderItemLots(itemIds);
  return new Map([...m].map(([id, l]) => [id, l.shipped.length ? l.shipped : l.allocated]));
}

export type DisputeCase = {
  dispute: DisputeRow;
  facts: EvidenceFacts;
  events: DisputeEventRow[];
  customer: { id: string; name: string; isOwner: boolean; blockedAt: string | null; paidOrders: number; openCheckouts: Array<{ number: string; totalCents: number }> };
};

// Everything the chargeback page and the evidence need, from our records.
export async function getDisputeCase(id: string): Promise<DisputeCase | null> {
  const dispute = await getDisputeRow(id);
  if (!dispute) return null;
  const order = await getOrderById(dispute.order_id);
  if (!order) return fail("dispute order read", `order ${dispute.order_id} not found`);
  const items = order.order_items ?? [];
  const [customer, user, agreement, orders, events, picked] = await Promise.all([
    customerRow(order.customer_id), authUser(order.customer_id, order.email), latestAgreement(order.customer_id),
    customerOrders(order.customer_id), disputeEvents(id), itemLots(items.map((i) => i.id)),
  ]);
  const lotNumbers = [...new Set([...[...picked.values()].flat().map((l) => l.lotNumber), ...items.map((i) => i.lot_number)])];
  const [details, disputed] = await Promise.all([lotDetails(lotNumbers), disputedOrderIds(orders.map((o) => o.id))]);
  const before = order.paid_at ?? order.created_at;
  const paid = (s: OrderStatus) => s === "paid" || s === "shipped";
  const facts: EvidenceFacts = {
    stripeDisputeId: dispute.stripe_dispute_id, reason: dispute.reason, amountCents: dispute.amount_cents, openedAt: dispute.opened_at,
    cardBrand: dispute.card_brand, cardLast4: dispute.card_last4, billingAddress: dispute.billing_address,
    order: {
      number: order.order_number, status: order.status, email: order.email, createdAt: order.created_at, paidAt: order.paid_at, ruoConfirmedAt: order.ruo_confirmed_at,
      ship: { name: order.ship_name, line1: order.ship_line1, line2: order.ship_line2, city: order.ship_city, state: order.ship_state, zip: order.ship_zip },
      carrier: order.carrier, tracking: order.tracking_number, shippedAt: order.shipped_at,
      subtotalCents: order.subtotal_cents, discountCents: order.partner_discount_cents, shippingCents: order.shipping_cents,
      insuranceCents: order.insurance_cents, taxCents: order.tax_cents, totalCents: order.total_cents, creditCents: order.store_credit_cents,
    },
    items: items.map((i) => {
      const vials = i.pack_qty * i.quantity;
      const lots = picked.get(i.id)?.length ? picked.get(i.id)! : [{ lotNumber: i.lot_number, qty: vials }];
      return {
        name: i.compound_name, strength: i.strength, vials, lineTotalCents: i.line_total_cents,
        lots: lots.map((l) => {
          const d = details.get(l.lotNumber);
          return { lotNumber: l.lotNumber, vials: l.qty, purityPct: d ? Number(d.purity_pct) : null, method: d?.method ?? null, coaUrl: d?.coa_path ? coaPublicUrl(d.coa_path) : null };
        }),
      };
    }),
    customer: { name: customer.full_name, email: user.email, createdAt: customer.created_at, lastSignInAt: user.lastSignInAt },
    agreement: agreement
      ? { agreedAt: agreement.agreed_at, termsVersion: agreement.terms_version, age21: agreement.age_21, ruo: agreement.ruo, disputePolicy: agreement.dispute_policy, ipHash: agreement.ip_hash, userAgent: agreement.user_agent }
      : null,
    priorOrders: orders.filter((x) => x.id !== order.id && x.paid_at && x.paid_at < before && paid(x.status))
      .map((x) => ({ number: x.order_number, paidAt: x.paid_at!, disputed: disputed.has(x.id) })),
    site: siteUrl(),
  };
  return {
    dispute, facts, events,
    customer: {
      id: order.customer_id, name: customer.full_name, isOwner: customer.is_owner, blockedAt: customer.blocked_at,
      paidOrders: orders.filter((x) => paid(x.status)).length,
      openCheckouts: orders.filter((x) => x.status === "awaiting_payment").map((x) => ({ number: x.order_number, totalCents: x.total_cents })),
    },
  };
}

// ---------- owner writes ----------

export type SavedEvidence = { draft: EvidenceDraft; files: Partial<Record<FileField, string>>; sha: string };

export async function saveDraft(id: string, v: SavedEvidence): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db().from("disputes").update({ draft: v.draft, draft_saved_at: now, evidence_files: v.files, evidence_file_sha: v.sha, updated_at: now }).eq("id", id);
  if (error) fail("dispute draft save", error);
}

export async function markSubmitted(id: string, v: SavedEvidence, actor: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db().from("disputes").update({
    draft: v.draft, draft_saved_at: now, evidence_files: v.files, evidence_file_sha: v.sha,
    evidence_submitted: true, submitted_at: now, submitted_by: actor, updated_at: now,
  }).eq("id", id);
  if (error) fail("dispute submit save", error);
}

export async function markReminded(id: string, marks: Record<string, string>): Promise<void> {
  const { error } = await db().from("disputes").update({ reminded: marks }).eq("id", id);
  if (error) fail("dispute reminder save", error);
}

export async function getWarning(id: string): Promise<WarningRow | null> {
  const { data, error } = await db().from("early_fraud_warnings").select("*").eq("id", id).maybeSingle();
  if (error) fail("early fraud warning read", error);
  return (data as WarningRow | null) ?? null;
}

// true = resolved now; false = it was already resolved (a stale page).
export async function resolveWarning(id: string, action: Exclude<WarningAction, "disputed">, actor: string): Promise<boolean> {
  const { data, error } = await db().from("early_fraud_warnings").update({ resolved_action: action, resolved_at: new Date().toISOString(), resolved_by: actor })
    .eq("id", id).is("resolved_at", null).select("id");
  if (error) fail("early fraud warning resolve", error);
  return Array.isArray(data) && data.length === 1;
}
