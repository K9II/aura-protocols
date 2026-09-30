"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { getCustomer } from "@/lib/dal";
import { priceOrder, type PricedOrder, type Rejection } from "@/lib/pricing";
import { shipAddressSchema } from "@/lib/ship-address";
import {
  attachCheckoutSession, createPendingOrder, saveShipAddress, saveStripeCoupon, saveStripeCustomerId, transitionOrder,
} from "@/lib/orders";
import { getCommerceAdapter, STRIPE_MIN_CHARGE_CENTS } from "@/lib/commerce";
import { siteUrl } from "@/lib/supabase/env";
import { resolveAttribution } from "@/lib/partners/attribution";
import { applyPartnerCode } from "@/lib/partners/discounts";
import { creditBalance, spendCredit } from "@/lib/partners/ledger";
import { REF_COOKIE } from "@/lib/partners/ref-cookie";
import { afterOrderPaid } from "@/lib/order-paid";

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

export async function checkPartnerCodeAction(code: string): Promise<{ ok: true; code: string } | { ok: false; message: string }> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, message: "Please sign in." };
  const { attribution, codeError } = await resolveAttribution({ typedCode: String(code).slice(0, 40), buyerCustomerId: customer.id });
  if (!attribution) return { ok: false, message: codeError ?? "This code can't be used." };
  return { ok: true, code: attribution.code };
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
  let lineDiscountsCents = priced.items.map(() => 0);
  if (attribution?.via === "code") {
    const discounted = applyPartnerCode(priced);
    priced = discounted;
    lineDiscountsCents = discounted.lineDiscounts.map((d) => d.savingCents);
  }

  await saveShipAddress(customer.id, ship);
  const adapter = getCommerceAdapter();

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
      await transitionOrder(order.id, "awaiting_payment", "paid");
      await afterOrderPaid(order.id);
      return { url: `/order/${order.orderNumber}` };
    }
  }

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
    await attachCheckoutSession(order.id, result.sessionId);
    if (result.couponId) await saveStripeCoupon(order.id, result.couponId);
    if (!customer.stripeCustomerId) await saveStripeCustomerId(customer.id, result.stripeCustomerId);
    return { url: result.url };
  } catch (err) {
    console.error("checkout start failed:", err);
    await transitionOrder(order.id, "awaiting_payment", "cancelled");
    return { error: "We couldn't start payment — please try again." };
  }
}
