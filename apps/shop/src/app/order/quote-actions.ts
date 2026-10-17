"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCustomer } from "@/lib/dal";
import { attachCheckoutSession, getOrderForCustomer, saveShipAddress, saveStripeCustomerId, type OrderRow } from "@/lib/orders";
import { shipAddressSchema } from "@/lib/ship-address";
import { getCommerceAdapter } from "@/lib/commerce";
import { siteUrl } from "@/lib/supabase/env";
import { alertAddress, alertOwner, sendOrAlert } from "@/lib/notify";
import { ownerQuoteRequestClosedEmail, ownerTransferSentEmail } from "@/lib/emails";
import { bookkeep } from "@/lib/checkout-shared";
import { quoteOpen, sheetKitsParam } from "@/lib/wholesale/quote";
import { closeQuoteRequest, getBankDetails, markTransferSent, saveQuoteShip } from "@/lib/wholesale/quote-data";
import { currentMs } from "@/lib/clock";
import { localDate } from "@/lib/today/time";

// The customer's pay page for a wholesale quote order (mocks 2026-10-17, screens 4–5).
type Result = { ok?: true; url?: string; error?: string };
const CLOSED = "This quote has expired or was already paid. Reload the page, or reply to your order email.";

async function myQuote(orderNumber: string): Promise<{ order: OrderRow; email: string; fullName: string; stripeCustomerId: string | null; customerId: string } | { error: string }> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in." };
  const order = await getOrderForCustomer(String(orderNumber).slice(0, 20), customer.id);
  if (!order || order.channel !== "wholesale" || !order.quote_valid_until) return { error: "Order not found." };
  return { order, email: customer.email, fullName: customer.fullName, stripeCustomerId: customer.stripeCustomerId, customerId: customer.id };
}

const shipSchema = z.object({ ship: shipAddressSchema, ruoConfirmed: z.literal(true) });

// Address + research use, then sales tax on the whole order (carried in the balance).
export async function saveQuoteShipAction(orderNumber: string, input: unknown): Promise<Result> {
  const me = await myQuote(orderNumber);
  if ("error" in me) return me;
  const { order } = me;
  if (!quoteOpen(order, localDate(currentMs()))) return { error: CLOSED };
  const parsed = shipSchema.safeParse(input);
  if (!parsed.success) return { error: "Please complete the shipping address and confirm research use." };
  const { ship } = parsed.data;
  let tax: { calculationId: string; taxCents: number };
  try {
    const items = (order.order_items ?? []).map((i) => ({
      compoundSlug: i.compound_slug, compoundName: i.compound_name, chemicalClass: "", variantId: i.variant_id, strength: i.strength,
      packQty: i.pack_qty, quantity: i.quantity, listUnitCents: i.retail_unit_cents ?? i.unit_price_cents, packPct: 0,
      unitPriceCents: i.unit_price_cents, lineTotalCents: i.line_total_cents, lotNumber: "",
    }));
    tax = await getCommerceAdapter().quoteTax({ ship, items, lineDiscountsCents: items.map(() => 0), shippingCents: order.shipping_cents, insuranceCents: order.insurance_cents });
  } catch (err) {
    console.error("quote tax failed:", err);
    return { error: "We couldn't calculate sales tax — please try again." };
  }
  if (!(await saveQuoteShip(order, ship, tax))) return { error: CLOSED };
  await bookkeep("saving the shipping address", () => saveShipAddress(me.customerId, ship));
  revalidatePath(`/order/${order.order_number}`);
  return { ok: true };
}

// A fresh card page per click; the earlier one is expired first so only one can be paid.
export async function payQuoteDepositByCardAction(orderNumber: string): Promise<Result> {
  const me = await myQuote(orderNumber);
  if ("error" in me) return me;
  const { order } = me;
  if (!quoteOpen(order, localDate(currentMs()))) return { error: CLOSED };
  if (!order.quote_pay_card) return { error: "This order is paid by bank transfer." };
  if (!order.ruo_confirmed_at || !order.ship_name) return { error: "Please add your shipping address first." };
  const adapter = getCommerceAdapter();
  if (order.stripe_session_id) {
    try { await adapter.expireCheckout(order.stripe_session_id); } catch (err) { console.error("expire earlier quote deposit session failed:", err); }
  }
  try {
    const r = await adapter.createPaymentCheckout({
      orderId: order.id, orderNumber: order.order_number, siteUrl: siteUrl(),
      customer: { email: me.email, fullName: me.fullName, stripeCustomerId: me.stripeCustomerId },
      ship: { name: order.ship_name, line1: order.ship_line1, line2: order.ship_line2 ?? "", city: order.ship_city, state: order.ship_state as never, zip: order.ship_zip },
      payment: "deposit", label: `Deposit — order ${order.order_number}`, amountCents: order.deposit_cents ?? 0,
      cancelPath: `/order/${order.order_number}`, attempt: Math.floor(currentMs() / 1000),
    });
    if (r.kind === "unavailable") return { error: r.message };
    await attachCheckoutSession(order.id, r.sessionId);
    if (!me.stripeCustomerId) await bookkeep("saving the Stripe customer id", () => saveStripeCustomerId(me.customerId, r.stripeCustomerId), `Stripe customer ${r.stripeCustomerId} for customer ${me.customerId}`);
    return { url: r.url };
  } catch (err) {
    console.error("quote deposit checkout failed:", err);
    return { error: "We couldn't start payment — please try again." };
  }
}

// "I've sent the transfer": tells the owner; the order waits until the money is recorded.
export async function markTransferSentAction(orderNumber: string): Promise<Result> {
  const me = await myQuote(orderNumber);
  if ("error" in me) return me;
  const { order } = me;
  if (!order.quote_pay_bank) return { error: "This order is paid by card." };
  const payment = order.status === "quoted" ? "deposit" : order.status === "balance_due" ? "balance" : null;
  if (!payment) return { error: "Nothing is due on this order right now." };
  if (payment === "deposit" && (!quoteOpen(order, localDate(currentMs())) || !order.ruo_confirmed_at)) return { error: CLOSED };
  try {
    if (!(await getBankDetails())) {
      await alertOwner("Bank transfer details missing", `${order.order_number}: the customer can't see where to send the ${payment}; add the bank details in Admin → Wholesale → Settings.`);
      return { error: "We couldn't show the bank details — we've been alerted and will email you." };
    }
    if (!(await markTransferSent(order.id, payment, order.status as "quoted" | "balance_due"))) return { error: CLOSED };
  } catch (err) {
    console.error("transfer sent failed:", err);
    return { error: "That didn't save — please try again." };
  }
  const to = alertAddress();
  if (to) await sendOrAlert({ to, ...ownerTransferSentEmail(order, { payment }) }, `transfer sent ${order.order_number}`);
  revalidatePath(`/order/${order.order_number}`);
  return { ok: true };
}

// ---------- a volume-quote request not priced yet (quote-requests.sql) ----------
// "Cancel this request" and "Order now at the listed price" close it; the second
// then opens the order sheet with the same kits. Either says what happened if the
// owner priced it first.
async function myRequest(orderNumber: string): Promise<{ order: OrderRow; email: string; fullName: string } | { error: string }> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in." };
  const order = await getOrderForCustomer(String(orderNumber).slice(0, 20), customer.id);
  if (!order || order.channel !== "wholesale") return { error: "Order not found." };
  if (order.status !== "quote_requested") return { error: order.status === "quoted" ? "We've just priced this order — reload the page to see your price." : "This request is already closed. Reload the page." };
  return { order, email: customer.email, fullName: customer.fullName };
}

async function closeRequest(orderNumber: string, reason: "customer_cancelled" | "ordered_now"): Promise<Result & { kits?: string }> {
  const me = await myRequest(orderNumber);
  if ("error" in me) return me;
  const { order } = me;
  if (!(await closeQuoteRequest(order.id, reason))) return { error: "This request changed — reload the page." };
  // Tell the owner so nobody prices a closed request (the alert, not a failure, is the record).
  const to = alertAddress();
  if (to) await sendOrAlert({ to, ...ownerQuoteRequestClosedEmail({ orderNumber: order.order_number, name: me.fullName, email: me.email, reason, link: `${siteUrl()}/admin/orders/${order.order_number}` }) }, `quote request ${order.order_number} closed`);
  revalidatePath(`/order/${order.order_number}`);
  revalidatePath("/account");
  return { ok: true, kits: sheetKitsParam(order.order_items ?? []) };
}

export async function cancelQuoteRequestAction(orderNumber: string): Promise<Result> {
  const r = await closeRequest(orderNumber, "customer_cancelled");
  return r.error ? { error: r.error } : { ok: true };
}

export async function orderNowAtSheetPriceAction(orderNumber: string): Promise<Result> {
  const r = await closeRequest(orderNumber, "ordered_now");
  return r.error ? { error: r.error } : { ok: true, url: `/wholesale?step=order&kits=${encodeURIComponent(r.kits ?? "")}` };
}
