"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCustomer } from "@/lib/dal";
import { shipAddressSchema } from "@/lib/ship-address";
import { attachCheckoutSession, createPendingWholesaleOrder, getOrderForCustomer, saveBalanceSession, saveShipAddress, saveStripeCustomerId, stampWholesaleCancel, transitionOrder } from "@/lib/orders";
import { getCommerceAdapter } from "@/lib/commerce";
import { closeOpenCheckouts } from "@/lib/checkout-close";
import { siteUrl } from "@/lib/supabase/env";
import { alertOwner, sendOrAlert } from "@/lib/notify";
import { getLiveCatalog } from "@/lib/catalog-live";
import { verifyHumanCheck } from "@/lib/turnstile";
import { HUMAN_CHECK_FAILED, HUMAN_CHECK_UNAVAILABLE } from "@/lib/human-check";
import { RESEARCH_FIELDS, RESEARCH_ORG_MAX, RESEARCH_REQUIRED, RESEARCH_SAVE_FAILED } from "@/lib/account/research";
import { saveResearchVerification } from "@/lib/account/research-data";
import { bookkeep, requestIp, requestIpHash } from "@/lib/checkout-shared";
import { enableWholesale, getWholesaleSettings } from "@/lib/wholesale/data";
import { canCancelWholesale, cutoffFor, kitRows, MAX_KITS_PER_LINE, priceWholesale, type WholesaleSettings } from "@/lib/wholesale/rules";
import { refundCard } from "@/lib/refunds/stripe";
import { wholesaleCancelledEmail } from "@/lib/emails";
import { currentMs } from "@/lib/clock";
import { localDate } from "@/lib/today/time";
import type { Rejection } from "@/lib/pricing";

const CLOSED = "Wholesale ordering is not open yet — send us an inquiry below.";
const SETTINGS_DOWN = "Wholesale is briefly unavailable — please try again.";

async function openSettings(): Promise<WholesaleSettings | { error: string }> {
  try {
    const s = await getWholesaleSettings();
    return s.open ? s : { error: CLOSED };
  } catch (err) {
    console.error("wholesale settings read failed:", err);
    return { error: SETTINGS_DOWN };
  }
}

// ---------- turn wholesale on (self-serve) ----------
const enableSchema = z.object({
  agree: z.literal(true),
  research: z.object({ field: z.enum(RESEARCH_FIELDS), org: z.string().trim().min(1).max(RESEARCH_ORG_MAX) }).optional(),
});

export async function enableWholesaleAction(input: unknown): Promise<{ ok?: true; error?: string }> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in." };
  if (!customer.emailConfirmed) return { error: "Please verify your email first — check your inbox for the link." };
  const s = await openSettings();
  if ("error" in s) return { error: s.error };
  if (customer.wholesale?.disabledAt) return { error: "Wholesale was switched off for your account — contact us." };
  const parsed = enableSchema.safeParse(input);
  if (!parsed.success) return { error: "Please accept the wholesale terms." };
  if (!customer.research) {
    if (!parsed.data.research) return { error: RESEARCH_REQUIRED };
    try {
      await saveResearchVerification(customer.id, parsed.data.research);
    } catch (err) {
      console.error("research verification save failed:", err);
      return { error: RESEARCH_SAVE_FAILED };
    }
  }
  try {
    const r = await enableWholesale(customer.id, { ipHash: await requestIpHash(), userAgent: (await headers()).get("user-agent") });
    if (r === "disabled") return { error: "Wholesale was switched off for your account — contact us." };
  } catch (err) {
    console.error("wholesale enable failed:", err);
    return { error: "We couldn't turn wholesale on — please try again." };
  }
  revalidatePath("/wholesale");
  return { ok: true };
}

// ---------- start checkout: the 40% deposit ----------
const startSchema = z.object({
  lines: z.array(z.object({ slug: z.string().max(100), variantId: z.string().max(50), kits: z.number().int().min(1).max(MAX_KITS_PER_LINE) })).min(1).max(60),
  ship: shipAddressSchema,
  ruoConfirmed: z.literal(true),
  humanToken: z.string().max(4096).optional(),
});

export type StartWholesaleResult = { url?: string; error?: string; rejected?: Rejection[] };

export async function startWholesaleCheckoutAction(input: unknown): Promise<StartWholesaleResult> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in to order." };
  if (!customer.emailConfirmed) return { error: "Please verify your email first — check your inbox for the link." };
  const s = await openSettings();
  if ("error" in s) return { error: s.error };
  if (customer.wholesale?.disabledAt) return { error: "Wholesale was switched off for your account — contact us." };
  if (!customer.wholesale?.enabledAt || !customer.research) return { error: "Please turn on wholesale first." };

  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { error: "Please complete the shipping address and the research-use confirmation." };
  const { lines, ship, humanToken } = parsed.data;
  const kitCount = lines.reduce((n, l) => n + l.kits, 0);
  if (kitCount < s.minKits) return { error: `Wholesale orders need at least ${s.minKits} kits — add ${s.minKits - kitCount} more.` };

  const human = await verifyHumanCheck(humanToken, await requestIp(), new URL(siteUrl()).hostname);
  if (!human.ok) {
    if (human.reason === "unavailable") {
      await alertOwner("Checkout: human check unavailable", `Customer ${customer.id} (wholesale): ${human.detail}. No checkout can start until this is fixed.`);
      return { error: HUMAN_CHECK_UNAVAILABLE };
    }
    return { error: HUMAN_CHECK_FAILED };
  }

  let rows;
  try {
    rows = kitRows((await getLiveCatalog()).shown);
  } catch (err) {
    console.error("live catalog read failed:", err);
    return { error: "The store is briefly unavailable — please try again." };
  }
  const quote = priceWholesale(lines, rows, s);
  if (quote.rejected.length) return { error: "Some kits can't be ordered right now — they've been flagged below.", rejected: quote.rejected };
  if (quote.items.length === 0) return { error: "Add at least one kit." };
  if (quote.belowMinimum) return { error: `Wholesale orders need at least ${s.minKits} kits — add ${quote.kitsToMinimum} more.` };

  const adapter = getCommerceAdapter();
  const { failed } = await closeOpenCheckouts(customer.id, adapter, { all: false });
  for (const f of failed) {
    await alertOwner("Couldn't close an earlier checkout", `Starting a wholesale checkout for customer ${customer.id}, order ${f.orderNumber} (${f.id}) could not be closed: ${f.error}.`);
  }
  await bookkeep("saving the shipping address", () => saveShipAddress(customer.id, ship));

  // Tax is quoted now on the whole order and carried in the balance (Part 2).
  let tax: { calculationId: string; taxCents: number };
  try {
    tax = await adapter.quoteTax({ ship, items: quote.items, lineDiscountsCents: quote.items.map(() => 0), shippingCents: quote.shippingCents, insuranceCents: quote.insuranceCents });
  } catch (err) {
    console.error("tax quote failed:", err);
    return { error: "We couldn't calculate sales tax — please try again." };
  }

  const cutoffOn = cutoffFor(localDate(currentMs()), { runDays: s.runDays, override: s.nextCutoffOverride });
  const order = await createPendingWholesaleOrder({ customerId: customer.id, email: customer.email, ship, quote, cutoffOn, taxCents: tax.taxCents, taxCalculationId: tax.calculationId });

  const cancelPending = async (why: string): Promise<void> => {
    try {
      await transitionOrder(order.id, "awaiting_payment", "cancelled");
    } catch (err) {
      console.error(`cancel order after ${why} failed:`, err);
      await alertOwner("Couldn't cancel an order after a failed checkout", `Wholesale order ${order.orderNumber} (${order.id}) could not be cancelled after ${why}: ${String(err)}. The reconcile cron cancels it later.`);
    }
  };

  let sessionId: string | null = null;
  try {
    const r = await adapter.createPaymentCheckout({
      orderId: order.id, orderNumber: order.orderNumber, siteUrl: siteUrl(),
      customer: { email: customer.email, fullName: customer.fullName, stripeCustomerId: customer.stripeCustomerId }, ship,
      payment: "deposit", label: `Deposit (${s.depositPct}%) — order ${order.orderNumber} · ${quote.kits} kit${quote.kits === 1 ? "" : "s"}`,
      amountCents: quote.depositCents, cancelPath: "/wholesale",
    });
    if (r.kind === "unavailable") { await cancelPending("Stripe was unavailable"); return { error: r.message }; }
    sessionId = r.sessionId;
    await attachCheckoutSession(order.id, r.sessionId);
    if (!customer.stripeCustomerId) await bookkeep("saving the Stripe customer id", () => saveStripeCustomerId(customer.id, r.stripeCustomerId), `Stripe customer ${r.stripeCustomerId} for customer ${customer.id}`);
    return { url: r.url };
  } catch (err) {
    console.error("wholesale checkout start failed:", err);
    if (sessionId) {
      try { await adapter.expireCheckout(sessionId); } catch (expireErr) {
        await alertOwner("Couldn't close the Stripe page for a failed checkout", `Wholesale ${order.orderNumber}: session ${sessionId}; expiring it failed: ${String(expireErr)}.`);
      }
    }
    await cancelPending("a failed payment start");
    return { error: "We couldn't start payment — please try again." };
  }
}

// ---------- cancel before the cutoff: full deposit refund ----------
export async function cancelWholesaleOrderAction(orderNumber: string): Promise<{ ok?: true; error?: string }> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in." };
  const order = await getOrderForCustomer(String(orderNumber).slice(0, 20), customer.id);
  if (!order || order.channel !== "wholesale") return { error: "Order not found." };
  // Already cancelled (a second click, or the webhook beat us to it on an
  // earlier call): nothing left to do.
  if (order.status === "refunded") return { ok: true };
  if (!canCancelWholesale(order, localDate(currentMs()))) {
    return { error: "This order is past its order-by date, so it can't be cancelled here. Contact us if something is wrong." };
  }
  if (!order.deposit_payment_intent || !order.deposit_cents) {
    await alertOwner("Wholesale cancel: no deposit payment on record", `${order.order_number} is deposit_paid but has no deposit payment intent. Refund by hand in Stripe.`);
    return { error: "We couldn't cancel this order — we've been alerted and will contact you." };
  }
  let refundId: string;
  try {
    refundId = await refundCard(order.deposit_payment_intent, order.deposit_cents, `order-refund-${order.id}-deposit`);
  } catch (err) {
    console.error("wholesale deposit refund failed:", err);
    return { error: "We couldn't refund your deposit — please try again." };
  }
  let moved = false;
  try {
    moved = await transitionOrder(order.id, "deposit_paid", "refunded", { refund_destination: "card", refund_reason: "customer_cancelled", stripe_refund_id: refundId });
  } catch (err) {
    console.error("wholesale cancel transition failed:", err);
  }
  // The charge.refunded webhook may win the race and move it first — that's
  // fine, but then it doesn't know this refund was the customer's own cancel,
  // so the refund details (and the email) are still ours to finish.
  let shouldEmail = moved;
  if (!moved) {
    const now = await getOrderForCustomer(order.order_number, customer.id);
    if (now?.status !== "refunded") {
      await alertOwner("Wholesale deposit refunded but order not updated", `${order.order_number}: Stripe refund ${refundId} succeeded; the order is still ${now?.status ?? "unknown"}. Mark it refunded by hand.`);
    } else if (!now.stripe_refund_id) {
      try {
        await stampWholesaleCancel(order.id, refundId);
      } catch (err) {
        console.error("wholesale cancel stamp failed:", err);
        await alertOwner("Wholesale cancel details not saved", `${order.order_number}: ${String(err)}`);
      }
      shouldEmail = true;
    }
    // else: the webhook already recorded the refund details and emailed — nothing left to do.
  }
  if (shouldEmail) {
    await sendOrAlert({ to: order.email, ...wholesaleCancelledEmail(order) }, `wholesale cancelled ${order.order_number}`);
  }
  revalidatePath(`/order/${order.order_number}`);
  return { ok: true };
}

// ---------- pay the balance (order page) ----------
// A fresh Stripe page per click (sessions expire within 24 h; the balance has
// 7 days); the previous page is expired first so only one can be paid.
export async function payBalanceAction(orderNumber: string): Promise<{ url?: string; error?: string }> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in." };
  const order = await getOrderForCustomer(String(orderNumber).slice(0, 20), customer.id);
  if (!order || order.channel !== "wholesale") return { error: "Order not found." };
  if (order.status !== "balance_due" || !order.balance_cents) return { error: "This order has no balance due." };
  const adapter = getCommerceAdapter();
  if (order.balance_session_id) {
    try { await adapter.expireCheckout(order.balance_session_id); } catch (err) { console.error("expire earlier balance session failed:", err); }
  }
  try {
    const r = await adapter.createPaymentCheckout({
      orderId: order.id, orderNumber: order.order_number, siteUrl: siteUrl(),
      customer: { email: customer.email, fullName: customer.fullName, stripeCustomerId: customer.stripeCustomerId },
      ship: { name: order.ship_name, line1: order.ship_line1, line2: order.ship_line2 ?? "", city: order.ship_city, state: order.ship_state as never, zip: order.ship_zip },
      payment: "balance", label: `Balance — order ${order.order_number}`, amountCents: order.balance_cents,
      cancelPath: `/order/${order.order_number}`, attempt: Math.floor(currentMs() / 1000),
    });
    if (r.kind === "unavailable") return { error: r.message };
    await saveBalanceSession(order.id, r.sessionId);
    return { url: r.url };
  } catch (err) {
    console.error("balance checkout failed:", err);
    return { error: "We couldn't start payment — please try again." };
  }
}
