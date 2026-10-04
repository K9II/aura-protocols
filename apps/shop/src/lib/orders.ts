import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { canTransition, type OrderStatus } from "@/lib/order-status";
import type { PricedOrder } from "@/lib/pricing";
import type { ShipAddress } from "@/lib/ship-address";

export type OrderItemRow = {
  compound_slug: string; compound_name: string; variant_id: string; strength: string; pack_qty: number;
  quantity: number; unit_price_cents: number; line_total_cents: number; lot_number: string;
};
export type OrderRow = {
  id: string; order_number: string; customer_id: string; email: string; status: OrderStatus;
  ship_name: string; ship_line1: string; ship_line2: string | null; ship_city: string; ship_state: string; ship_zip: string;
  subtotal_cents: number; shipping_cents: number; insurance_cents: number; tax_cents: number; total_cents: number;
  partner_id: string | null; attributed_by: "code" | "link" | null; partner_discount_cents: number; welcome_code: string | null; store_credit_cents: number;
  stripe_coupon_id: string | null; tax_calculation_id: string | null; tax_transaction_id: string | null;
  ruo_confirmed_at: string; stripe_session_id: string | null; stripe_payment_intent: string | null;
  tracking_number: string | null; carrier: string | null;
  paid_at: string | null; shipped_at: string | null; cancelled_at: string | null; refunded_at: string | null;
  expires_at: string; created_at: string;
  order_items?: OrderItemRow[];
};

const db = () => getSupabaseAdminClient();
const ORDER_WITH_ITEMS = "*, order_items(*)";
const STAMP: Partial<Record<OrderStatus, keyof OrderRow>> = {
  paid: "paid_at", shipped: "shipped_at", cancelled: "cancelled_at", refunded: "refunded_at",
};

export async function createPendingOrder(input: {
  customerId: string; email: string; ship: ShipAddress; priced: PricedOrder;
  partner?: { partnerId: string; attributedBy: "code" | "link" } | null;
  storeCreditCents?: number; taxCents?: number; taxCalculationId?: string | null;
  welcomeCode?: string | null;
}): Promise<{ id: string; orderNumber: string }> {
  const { customerId, email, ship, priced } = input;
  const taxCents = input.taxCents ?? 0;
  const now = new Date();
  const { data, error } = await db().from("orders").insert({
    customer_id: customerId, email, status: "awaiting_payment",
    ship_name: ship.name, ship_line1: ship.line1, ship_line2: ship.line2, ship_city: ship.city, ship_state: ship.state, ship_zip: ship.zip,
    subtotal_cents: priced.subtotalCents, shipping_cents: priced.shippingCents, insurance_cents: priced.insuranceCents, tax_cents: taxCents,
    total_cents: priced.totalBeforeTaxCents + taxCents,
    partner_id: input.partner?.partnerId ?? null, attributed_by: input.partner?.attributedBy ?? null,
    partner_discount_cents: priced.partnerDiscountCents, welcome_code: input.welcomeCode ?? null, store_credit_cents: input.storeCreditCents ?? 0,
    tax_calculation_id: input.taxCalculationId ?? null,
    ruo_confirmed_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
  }).select("id, order_number").single();
  if (error || !data) throw new Error(`order insert failed: ${JSON.stringify(error)}`);
  const order = data as { id: string; order_number: string };
  const { error: itemsError } = await db().from("order_items").insert(priced.items.map((i) => ({
    order_id: order.id, compound_slug: i.compoundSlug, compound_name: i.compoundName, variant_id: i.variantId,
    strength: i.strength, pack_qty: i.packQty, quantity: i.quantity, unit_price_cents: i.unitPriceCents,
    line_total_cents: i.lineTotalCents, lot_number: i.lotNumber,
  })));
  if (itemsError) {
    await db().from("orders").delete().eq("id", order.id);
    throw new Error(`order_items insert failed: ${JSON.stringify(itemsError)}`);
  }
  return { id: order.id, orderNumber: order.order_number };
}

export async function saveStripeCoupon(orderId: string, couponId: string): Promise<void> {
  const { error } = await db().from("orders").update({ stripe_coupon_id: couponId }).eq("id", orderId);
  if (error) throw new Error(`save Stripe coupon failed: ${JSON.stringify(error)}`);
}

// Records the Stripe Tax transaction id once it's created, so a later full
// refund can reverse it. tax_calculation_id is left alone.
export async function saveTaxTransactionId(orderId: string, transactionId: string): Promise<void> {
  const { error } = await db().from("orders").update({ tax_transaction_id: transactionId }).eq("id", orderId);
  if (error) throw new Error(`save tax transaction id failed: ${JSON.stringify(error)}`);
}

export async function attachCheckoutSession(orderId: string, sessionId: string): Promise<void> {
  const { error } = await db().from("orders").update({ stripe_session_id: sessionId }).eq("id", orderId);
  if (error) throw new Error(`attach session failed: ${JSON.stringify(error)}`);
}

export async function transitionOrder(
  id: string, from: OrderStatus, to: OrderStatus, patch: Record<string, unknown> = {},
): Promise<boolean> {
  if (!canTransition(from, to)) throw new Error(`Illegal order transition ${from} → ${to}`);
  const stamp = STAMP[to];
  const { data, error } = await db().from("orders")
    .update({ ...patch, status: to, ...(stamp ? { [stamp]: new Date().toISOString() } : {}) })
    .eq("id", id).eq("status", from).select("id");
  if (error) throw new Error(`transition failed: ${JSON.stringify(error)}`);
  return Array.isArray(data) && data.length === 1;
}

export async function getOrderById(id: string): Promise<OrderRow | null> {
  const { data } = await db().from("orders").select(ORDER_WITH_ITEMS).eq("id", id).maybeSingle();
  return (data as OrderRow | null) ?? null;
}

export async function getOrderByPaymentIntent(paymentIntent: string): Promise<OrderRow | null> {
  const { data } = await db().from("orders").select(ORDER_WITH_ITEMS).eq("stripe_payment_intent", paymentIntent).maybeSingle();
  return (data as OrderRow | null) ?? null;
}

export async function getOrderForCustomer(orderNumber: string, customerId: string): Promise<OrderRow | null> {
  const { data } = await db().from("orders").select(ORDER_WITH_ITEMS)
    .eq("order_number", orderNumber).eq("customer_id", customerId).maybeSingle();
  return (data as OrderRow | null) ?? null;
}

export async function listOrdersForCustomer(customerId: string): Promise<OrderRow[]> {
  const { data } = await db().from("orders").select(ORDER_WITH_ITEMS)
    .eq("customer_id", customerId).neq("status", "awaiting_payment").order("created_at", { ascending: false });
  return (data as OrderRow[] | null) ?? [];
}

export async function listOrdersForOwner(status: OrderStatus | "all"): Promise<OrderRow[]> {
  let q = db().from("orders").select(ORDER_WITH_ITEMS).neq("status", "awaiting_payment");
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q.order("created_at", { ascending: false }).limit(200);
  return (data as OrderRow[] | null) ?? [];
}

export type OpenOrder = { id: string; order_number: string; stripe_session_id: string | null; created_at: string; store_credit_cents: number };

// A customer's checkouts that never finished (newest last), so a new checkout
// can close them and hand back any store credit they hold.
export async function listOpenOrdersForCustomer(customerId: string): Promise<OpenOrder[]> {
  const { data, error } = await db().from("orders").select("id, order_number, stripe_session_id, created_at, store_credit_cents")
    .eq("customer_id", customerId).eq("status", "awaiting_payment").order("created_at", { ascending: true });
  if (error) throw new Error(`open orders select failed: ${JSON.stringify(error)}`);
  return (data as OpenOrder[] | null) ?? [];
}

// Starting a new checkout closes an unfinished one if it reached Stripe's page,
// or never did and is over 10 minutes old (a younger one may be another tab
// still starting). The checkout page and the checkout action share this rule.
export const ABANDONED_CHECKOUT_AFTER_MS = 10 * 60 * 1000;
export function willReleaseOnNewCheckout(o: Pick<OpenOrder, "stripe_session_id" | "created_at">, nowMs: number = Date.now()): boolean {
  return !!o.stripe_session_id || nowMs - new Date(o.created_at).getTime() >= ABANDONED_CHECKOUT_AFTER_MS;
}
// Store credit those checkouts hold, which the next checkout hands back before spending.
export function releasableCreditCents(open: OpenOrder[], nowMs: number = Date.now()): number {
  return open.filter((o) => willReleaseOnNewCheckout(o, nowMs)).reduce((s, o) => s + (o.store_credit_cents ?? 0), 0);
}

// Pending orders that never got a Stripe page (the checkout died mid-way):
// nothing will ever expire them, so the reconcile cron cancels them.
export async function listOrphanedPendingOrders(olderThanIso: string): Promise<{ id: string; order_number: string }[]> {
  const { data, error } = await db().from("orders").select("id, order_number")
    .eq("status", "awaiting_payment").is("stripe_session_id", null).lt("created_at", olderThanIso);
  if (error) throw new Error(`orphaned orders select failed: ${JSON.stringify(error)}`);
  return (data as { id: string; order_number: string }[] | null) ?? [];
}

// Tab counts for the owner orders page (same scope as listOrdersForOwner).
export async function countOrdersForOwner(): Promise<{ paid: number; processing: number; shipped: number; all: number }> {
  const { data } = await db().from("orders").select("status").neq("status", "awaiting_payment");
  const rows = (data as { status: OrderStatus }[] | null) ?? [];
  const n = (s: OrderStatus) => rows.filter((r) => r.status === s).length;
  return { paid: n("paid"), processing: n("processing"), shipped: n("shipped"), all: rows.length };
}

export async function saveShipAddress(customerId: string, ship: ShipAddress): Promise<void> {
  const { error } = await db().from("customers").update({
    ship_name: ship.name, ship_line1: ship.line1, ship_line2: ship.line2,
    ship_city: ship.city, ship_state: ship.state, ship_zip: ship.zip,
  }).eq("id", customerId);
  if (error) throw new Error(`save ship address failed: ${JSON.stringify(error)}`);
}

export async function saveStripeCustomerId(customerId: string, stripeCustomerId: string): Promise<void> {
  const { error } = await db().from("customers").update({ stripe_customer_id: stripeCustomerId }).eq("id", customerId);
  if (error) throw new Error(`save Stripe customer failed: ${JSON.stringify(error)}`);
}

// Idempotency ledger: "process" for new events and for earlier attempts that
// failed (processed_at null, so Stripe's retry gets another go); "duplicate"
// only once an event has been fully processed.
export async function beginStripeEvent(eventId: string, type: string): Promise<"process" | "duplicate"> {
  const { error } = await db().from("stripe_events").insert({ event_id: eventId, type });
  if (!error) return "process";
  if ((error as { code?: string }).code !== "23505") throw new Error(`stripe_events insert failed: ${JSON.stringify(error)}`);
  const { data } = await db().from("stripe_events").select("processed_at").eq("event_id", eventId).maybeSingle();
  return (data as { processed_at: string | null } | null)?.processed_at ? "duplicate" : "process";
}

export async function finishStripeEvent(eventId: string, errorMessage?: string): Promise<void> {
  await db().from("stripe_events").update(
    errorMessage ? { error: errorMessage.slice(0, 1000) } : { processed_at: new Date().toISOString(), error: null },
  ).eq("event_id", eventId);
}
