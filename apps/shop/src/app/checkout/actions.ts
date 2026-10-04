"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { getCustomer } from "@/lib/dal";
import { priceOrder, type PricedOrder, type Rejection } from "@/lib/pricing";
import { shipAddressSchema } from "@/lib/ship-address";
import {
  attachCheckoutSession, createPendingOrder, listOpenOrdersForCustomer, willReleaseOnNewCheckout, saveShipAddress, saveStripeCoupon, saveStripeCustomerId, transitionOrder,
} from "@/lib/orders";
import { getCommerceAdapter, STRIPE_MIN_CHARGE_CENTS, type CommerceAdapter } from "@/lib/commerce";
import { siteUrl } from "@/lib/supabase/env";
import { resolveAttribution } from "@/lib/partners/attribution";
import { applyCodeDiscount, applyPartnerCode } from "@/lib/partners/discounts";
import { offerForCustomer } from "@/lib/account/offer-data";
import { NEW_ACCOUNT_PCT, type FirstOrderOffer } from "@/lib/account/offer";
import { creditBalance, spendCredit } from "@/lib/partners/ledger";
import { REF_COOKIE } from "@/lib/partners/ref-cookie";
import { afterOrderPaid } from "@/lib/order-paid";
import { alertOwner } from "@/lib/notify";

const OFFER_CHECK_FAILED = "We couldn't check your new-account discount — please try again.";

export type StartCheckoutResult = { url?: string; error?: string; rejected?: Rejection[]; codeError?: string };

const schema = z.object({
  lines: z.array(z.object({
    slug: z.string().max(100), variantId: z.string().max(50),
    packQty: z.number().int(), quantity: z.number().int(),
  })).min(1).max(50),
  ship: shipAddressSchema,
  ruoConfirmed: z.literal(true),
  partnerCode: z.string().max(40).optional(),
  useCredit: z.boolean().optional(),
});

// No rate limiter is applied here: none exists anywhere in this codebase
// today (the /api/gate and /api/inquiry routes have none either) to reuse
// per customer, and this is a signed-in server action, not an anonymous
// public endpoint.
// needsSignIn: the code wasn't refused, the shopper just isn't signed in and
// verified yet (codes are only checked for verified accounts). The cart then
// keeps the code and checkout applies it.
export async function checkPartnerCodeAction(code: string): Promise<{ ok: true; code: string } | { ok: false; message: string; needsSignIn?: true }> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, message: "Please sign in.", needsSignIn: true };
  if (!customer.emailConfirmed) return { ok: false, message: "Please verify your email first — check your inbox for the link.", needsSignIn: true };
  const typed = String(code).slice(0, 40); // server action: the argument is untrusted
  const { attribution, codeError } = await resolveAttribution({ typedCode: typed, buyerCustomerId: customer.id });
  if (!attribution) return { ok: false, message: codeError ?? "This code can't be used." };
  return { ok: true, code: attribution.code };
}

// Saves that only keep records tidy (saved address, coupon id, Stripe
// customer id) must never cancel a checkout the customer can pay; a failure
// is reported to the owner instead.
async function bookkeep(what: string, save: () => Promise<void>): Promise<void> {
  try {
    await save();
  } catch (err) {
    console.error(`${what} failed:`, err);
    await alertOwner(`Checkout: ${what} failed`, String(err));
  }
}

// A customer who goes back from Stripe (or closes the tab) leaves an order
// awaiting payment for up to 23 h, holding any store credit it reserved.
// Starting a new checkout closes those first: expire the Stripe page, cancel
// the order, and the release_credit_on_cancel trigger hands the credit back.
// An order with no Stripe page yet may belong to another tab that's still
// starting, so it's only cancelled once it's 10 minutes old (willReleaseOnNewCheckout).
async function releaseAbandonedCheckouts(customerId: string, adapter: CommerceAdapter): Promise<void> {
  for (const o of await listOpenOrdersForCustomer(customerId)) {
    try {
      if (!willReleaseOnNewCheckout(o)) continue;
      if (o.stripe_session_id && (await adapter.expireCheckout(o.stripe_session_id)) === "complete") continue; // paid; the webhook records it
      await transitionOrder(o.id, "awaiting_payment", "cancelled");
    } catch (err) {
      await alertOwner(`Couldn't close an earlier checkout (${o.order_number})`,
        `Starting a new checkout for customer ${customerId}, order ${o.order_number} (${o.id}, session ${o.stripe_session_id ?? "none"}) could not be closed: ${String(err)}. Any store credit it holds stays held until it expires.`);
    }
  }
}

export async function startCheckoutAction(input: unknown): Promise<StartCheckoutResult> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in to check out." };
  if (!customer.emailConfirmed) return { error: "Please verify your email first — check your inbox for the link." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Please complete the shipping address and confirm research use." };
  const { lines, ship, partnerCode, useCredit } = parsed.data;

  let priced: PricedOrder = priceOrder(lines);
  if (priced.rejected.length) return { error: "Some items can't be ordered right now — they've been flagged below.", rejected: priced.rejected };
  if (priced.items.length === 0) return { error: "Your cart is empty." };

  const refCookie = (await cookies()).get(REF_COOKIE)?.value;
  const { attribution, codeError } = await resolveAttribution({ typedCode: partnerCode, refCookie, buyerCustomerId: customer.id });
  if (codeError) return { error: codeError, codeError };
  // One discount per line. A new account's first order (within 14 days) gets
  // 15%, which beats any partner code; a partner code or link still
  // attributes the order to the partner for commission.
  let offer: FirstOrderOffer = null;
  try {
    offer = await offerForCustomer(customer);
  } catch (err) {
    console.error("new-account offer check failed:", err);
    return { error: OFFER_CHECK_FAILED };
  }
  let lineDiscountsCents = priced.items.map(() => 0);
  if (offer || attribution?.via === "code") {
    const discounted = offer ? applyCodeDiscount(priced, NEW_ACCOUNT_PCT) : applyPartnerCode(priced);
    priced = discounted;
    lineDiscountsCents = discounted.lineDiscounts.map((d) => d.savingCents);
  }

  await bookkeep("saving the shipping address", () => saveShipAddress(customer.id, ship));
  const adapter = getCommerceAdapter();
  await releaseAbandonedCheckouts(customer.id, adapter);

  // Store credit is a payment, not a discount: tax is computed on the full
  // price first, then credit covers as much of the total as it can.
  let credit: { creditCents: number; taxCents: number; calculationId: string } | null = null;
  if (useCredit) {
    const balance = await creditBalance(customer.id);
    if (balance > 0) {
      try {
        const q = await adapter.quoteTax({ ship, items: priced.items, lineDiscountsCents, shippingCents: priced.shippingCents, insuranceCents: priced.insuranceCents });
        const totalWithTax = priced.totalBeforeTaxCents + q.taxCents;
        let creditCents = Math.min(balance, totalWithTax);
        const remaining = totalWithTax - creditCents;
        if (remaining > 0 && remaining < STRIPE_MIN_CHARGE_CENTS) creditCents = totalWithTax - STRIPE_MIN_CHARGE_CENTS;
        credit = { creditCents, taxCents: q.taxCents, calculationId: q.calculationId };
      } catch (err) {
        console.error("tax quote failed:", err);
        return { error: "We couldn't calculate sales tax — please try again." };
      }
    }
  }

  const order = await createPendingOrder({
    customerId: customer.id, email: customer.email, ship, priced,
    partner: attribution ? { partnerId: attribution.partnerId, attributedBy: attribution.via } : null,
    storeCreditCents: credit?.creditCents ?? 0, taxCents: credit?.taxCents ?? 0, taxCalculationId: credit?.calculationId ?? null,
    newAccountDiscount: !!offer,
  });

  // Credit is held (spent) the moment we commit to it, even for a partial
  // amount — before Stripe ever sees a checkout, so nothing is discounted
  // against credit we haven't actually secured. Every path that follows
  // (Stripe failure below, session expiry, an async payment that never
  // completes, the reconcile cron) transitions the order to "cancelled", and
  // the release_credit_on_cancel trigger (partners.sql) returns the held
  // amount automatically — no extra app code needed.
  if (credit) {
    if (!(await spendCredit(customer.id, credit.creditCents, order.id))) {
      await transitionOrder(order.id, "awaiting_payment", "cancelled");
      return { error: "Your store credit balance changed — please review your order again." };
    }
    if (credit.creditCents === priced.totalBeforeTaxCents + credit.taxCents) {
      let moved = false;
      try {
        moved = await transitionOrder(order.id, "awaiting_payment", "paid");
      } catch (err) {
        console.error("mark order paid (store credit) failed:", err);
      }
      if (!moved) {
        try {
          await transitionOrder(order.id, "awaiting_payment", "cancelled");
        } catch (err) {
          console.error("cancel order after failed paid transition failed:", err);
        }
        await alertOwner(
          "Store-credit order failed to mark paid",
          `Order ${order.orderNumber} (${order.id}): credit was spent but the order couldn't be moved to paid. It has been cancelled so the held credit is returned automatically.`,
        );
        return { error: "Something went wrong finishing your order — please try again." };
      }
      try {
        await afterOrderPaid(order.id);
      } catch (err) {
        console.error("afterOrderPaid failed:", err);
        await alertOwner(
          "afterOrderPaid failed for a paid store-credit order",
          `Order ${order.orderNumber} (${order.id}) is paid but post-payment processing (commission/emails) failed: ${String(err)}`,
        );
      }
      return { url: `/order/${order.orderNumber}` };
    }
  }

  let sessionId: string | null = null;
  try {
    const result = await adapter.createCheckout({
      orderId: order.id, orderNumber: order.orderNumber, siteUrl: siteUrl(),
      customer: { email: customer.email, fullName: customer.fullName, stripeCustomerId: customer.stripeCustomerId },
      ship, items: priced.items, shippingCents: priced.shippingCents, insuranceCents: priced.insuranceCents,
      partnerDiscountCents: priced.partnerDiscountCents, lineDiscountsCents,
      ...(credit ? { credit: { creditCents: credit.creditCents, taxCents: credit.taxCents } } : {}),
    });
    if (result.kind === "unavailable") {
      await transitionOrder(order.id, "awaiting_payment", "cancelled");
      return { error: result.message };
    }
    sessionId = result.sessionId;
    await attachCheckoutSession(order.id, result.sessionId);
    const couponId = result.couponId, stripeCustomerId = result.stripeCustomerId;
    if (couponId) await bookkeep(`saving coupon ${couponId} on ${order.orderNumber}`, () => saveStripeCoupon(order.id, couponId));
    if (!customer.stripeCustomerId) await bookkeep(`saving Stripe customer ${stripeCustomerId}`, () => saveStripeCustomerId(customer.id, stripeCustomerId));
    return { url: result.url };
  } catch (err) {
    console.error("checkout start failed:", err);
    // Stripe may already have a payable page for this order: close it so the
    // customer can't pay an order we're about to cancel.
    if (sessionId) {
      try {
        await adapter.expireCheckout(sessionId);
      } catch (expireErr) {
        await alertOwner(`Couldn't close the Stripe page for ${order.orderNumber}`,
          `Checkout failed after Stripe created session ${sessionId} for order ${order.orderNumber} (${order.id}); expiring it also failed: ${String(expireErr)}. If the customer pays it, the order is already cancelled - refund or recreate it.`);
      }
    }
    await transitionOrder(order.id, "awaiting_payment", "cancelled");
    return { error: "We couldn't start payment — please try again." };
  }
}
