"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { getCustomer } from "@/lib/dal";
import { priceOrder, type PricedOrder, type Rejection } from "@/lib/pricing";
import { shipAddressSchema } from "@/lib/ship-address";
import {
  attachCheckoutSession, createPendingOrder, saveShipAddress, saveStripeCoupon, saveStripeCustomerId, transitionOrder,
} from "@/lib/orders";
import { getCommerceAdapter, STRIPE_MIN_CHARGE_CENTS, type CommerceAdapter } from "@/lib/commerce";
import { closeOpenCheckouts } from "@/lib/checkout-close";
import { siteUrl } from "@/lib/supabase/env";
import { resolveAttribution } from "@/lib/partners/attribution";
import { offerForCustomer } from "@/lib/account/offer-data";
import { discountPct, type FirstOrderOffer } from "@/lib/account/offer";
import { creditBalance, spendCredit } from "@/lib/partners/ledger";
import { REF_COOKIE } from "@/lib/partners/ref-cookie";
import { afterOrderPaid } from "@/lib/order-paid";
import { alertOwner } from "@/lib/notify";
import { applyDiscounts } from "@/lib/discounts/engine";
import { claimCode, codeAttemptAllowed, getDiscountCap, recordCodeFailure } from "@/lib/discounts/data";
import { lookupDiscountCode } from "@/lib/discounts/redeem";
import { CLAIM_MESSAGE, CODE_MESSAGES, outcomeMessage, type ClaimResult } from "@/lib/discounts/messages";
import type { CodeTerms } from "@/lib/discounts/rules";
import { hashIp } from "@/lib/gate";
import { getLiveCatalog } from "@/lib/catalog-live";

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

async function requestIpHash(): Promise<string> {
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  return hashIp(ip);
}

type TypedCode =
  | { kind: "discount"; id: string; code: string; terms: CodeTerms }
  | { kind: "partner"; typed: string }
  | { kind: "error"; message: string };

// One code box: a discount code (lib/discounts) or a partner code. Wrong
// codes count toward 10 tries per 10 minutes per account and per network.
async function readTypedCode(typed: string, customer: { id: string; email: string }, ipHash: string): Promise<TypedCode> {
  try {
    if (!(await codeAttemptAllowed(customer.id, ipHash))) return { kind: "error", message: CODE_MESSAGES.tooMany };
    const r = await lookupDiscountCode(typed, customer);
    if (r.kind === "discount") return r;
    if (r.kind === "error") { await noteFailedCode(customer.id, ipHash); return r; }
    return { kind: "partner", typed };
  } catch (err) {
    console.error("discount code check failed:", err);
    return { kind: "error", message: CODE_MESSAGES.couldntCheck };
  }
}

async function noteFailedCode(customerId: string, ipHash: string): Promise<void> {
  await bookkeep("recording a failed code try", () => recordCodeFailure(customerId, ipHash));
}

export type CodeCheckResult =
  | { ok: true; kind: "partner"; code: string }
  | { ok: true; kind: "discount"; code: string; terms: CodeTerms; capPct: number }
  | { ok: false; message: string; needsSignIn?: true };

// needsSignIn: the code wasn't refused, the shopper just isn't signed in and
// verified yet (codes are only checked for verified accounts). The cart then
// keeps the code and checkout applies it.
export async function checkCodeAction(code: string): Promise<CodeCheckResult> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, message: "Please sign in.", needsSignIn: true };
  if (!customer.emailConfirmed) return { ok: false, message: CODE_MESSAGES.confirmEmail, needsSignIn: true };
  const typed = String(code).slice(0, 40); // server action: the argument is untrusted
  const ipHash = await requestIpHash();
  const r = await readTypedCode(typed, customer, ipHash);
  if (r.kind === "error") return { ok: false, message: r.message };
  if (r.kind === "discount") {
    try {
      return { ok: true, kind: "discount", code: r.code, terms: r.terms, capPct: await getDiscountCap() };
    } catch (err) {
      console.error("discount cap read failed:", err);
      return { ok: false, message: CODE_MESSAGES.couldntCheck };
    }
  }
  const { attribution, codeError } = await resolveAttribution({ typedCode: typed, buyerCustomerId: customer.id });
  if (!attribution) { await noteFailedCode(customer.id, ipHash); return { ok: false, message: codeError ?? CODE_MESSAGES.invalid }; }
  return { ok: true, kind: "partner", code: attribution.code };
}

// A customer who goes back from Stripe (or closes the tab) leaves an order
// awaiting payment for up to 23 h, holding any store credit it reserved.
// Starting a new checkout closes those first (lib/checkout-close.ts): expire
// the Stripe page, cancel the order, and the release_credit_on_cancel trigger
// hands the credit back. An order with no Stripe page yet may belong to another
// tab that's still starting, so it's only cancelled once it's 10 minutes old.
async function releaseAbandonedCheckouts(customerId: string, adapter: CommerceAdapter): Promise<void> {
  const { failed } = await closeOpenCheckouts(customerId, adapter, { all: false });
  for (const f of failed) {
    await alertOwner(`Couldn't close an earlier checkout (${f.orderNumber})`,
      `Starting a new checkout for customer ${customerId}, order ${f.orderNumber} (${f.id}, session ${f.sessionId ?? "none"}) could not be closed: ${f.error}. Any store credit it holds stays held until it expires.`);
  }
}

export async function startCheckoutAction(input: unknown): Promise<StartCheckoutResult> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in to check out." };
  if (!customer.emailConfirmed) return { error: "Please verify your email first — check your inbox for the link." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Please complete the shipping address and confirm research use." };
  const { lines, ship, partnerCode, useCredit } = parsed.data;

  let live;
  try {
    live = await getLiveCatalog();
  } catch (err) {
    console.error("live catalog read failed:", err);
    return { error: "The store is briefly unavailable — please try again." };
  }
  let priced: PricedOrder = priceOrder(lines, live.shown);
  if (priced.rejected.length) return { error: "Some items can't be ordered right now — they've been flagged below.", rejected: priced.rejected };
  if (priced.items.length === 0) return { error: "Your cart is empty." };

  // Close earlier unfinished checkouts first: cancelling them releases any
  // code use they hold, so the code check below doesn't count the customer's
  // own abandoned order against them. Only for a valid, priceable cart.
  const adapter = getCommerceAdapter();
  await releaseAbandonedCheckouts(customer.id, adapter);

  let capPct: number;
  try {
    capPct = await getDiscountCap();
  } catch (err) {
    console.error("discount cap read failed:", err);
    return { error: CODE_MESSAGES.couldntCheck };
  }

  const ipHash = await requestIpHash();
  const typed = partnerCode?.trim();
  let discountCode: { id: string; code: string; terms: CodeTerms } | null = null;
  let partnerTyped: string | undefined;
  if (typed) {
    const r = await readTypedCode(typed, customer, ipHash);
    if (r.kind === "error") return { error: r.message, codeError: r.message };
    if (r.kind === "discount") discountCode = r; else partnerTyped = r.typed;
  }

  const refCookie = (await cookies()).get(REF_COOKIE)?.value;
  const { attribution, codeError } = await resolveAttribution({ typedCode: partnerTyped, refCookie, buyerCustomerId: customer.id });
  if (codeError) {
    await noteFailedCode(customer.id, ipHash);
    return { error: codeError, codeError };
  }
  // Discounts (lib/discounts/engine.ts): per item the larger of pack, the
  // automatic percent (new-account offer or a partner code, whichever is
  // larger — discountPct) or an item-% code; then an order code; then the
  // store-wide cap. A partner code or link still attributes the order to the
  // partner for commission.
  let offer: FirstOrderOffer = null;
  try {
    offer = await offerForCustomer(customer);
  } catch (err) {
    console.error("new-account offer check failed:", err);
    return { error: OFFER_CHECK_FAILED };
  }
  const result = applyDiscounts(priced, { auto: discountPct(!!offer, attribution?.via === "code"), code: discountCode?.terms ?? null, capPct });
  if (discountCode && (result.codeOutcome === "below_min" || result.codeOutcome === "no_eligible_items")) {
    const m = outcomeMessage(result, discountCode.code, discountCode.terms, capPct)!.text;
    return { error: m, codeError: m };
  }
  const codeApplied = !!discountCode && result.codeOutcome === "applied";
  priced = result;
  const lineDiscountsCents = result.lineDiscounts.map((d) => d.savingCents);
  const newAccountDiscount = result.newAccount;

  await bookkeep("saving the shipping address", () => saveShipAddress(customer.id, ship));

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
    newAccountDiscount,
    discountCode: codeApplied ? { id: discountCode!.id, discountCents: result.codeDiscountCents } : null,
  });

  // A use is held the moment the order exists; payment marks it used and any
  // cancel releases it (settle_code_on_order_status trigger). A claim that
  // can't be confirmed stops checkout — never silently full price.
  if (codeApplied) {
    // The customer still gets the code message if the cancel itself fails;
    // the owner is told, and the reconcile cron cancels the orphan later.
    const cancelUnclaimed = async (): Promise<void> => {
      try {
        await transitionOrder(order.id, "awaiting_payment", "cancelled");
      } catch (err) {
        console.error("cancel order after failed code claim failed:", err);
        await alertOwner(`Couldn't cancel ${order.orderNumber} after a discount-code claim failed`,
          `Order ${order.orderNumber} (${order.id}) could not be cancelled after its discount-code claim failed: ${String(err)}. A discount-code use may be held until the reconcile cron cancels the order.`);
      }
    };
    let claim: ClaimResult;
    try {
      claim = await claimCode({ codeId: discountCode!.id, orderId: order.id, customerId: customer.id, discountCents: result.codeDiscountCents, cappedCents: result.cappedCents });
    } catch (err) {
      console.error("discount code claim failed:", err);
      await cancelUnclaimed();
      return { error: CODE_MESSAGES.couldntCheck, codeError: CODE_MESSAGES.couldntCheck };
    }
    if (claim !== "ok") {
      await cancelUnclaimed();
      return { error: CLAIM_MESSAGE[claim], codeError: CLAIM_MESSAGE[claim] };
    }
  }

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
