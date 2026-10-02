import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import type { PricedItem } from "@/lib/pricing";
import type { ShipAddress } from "@/lib/ship-address";

export type CheckoutRequest = {
  orderId: string;
  orderNumber: string;
  siteUrl: string;
  customer: { email: string; fullName: string; stripeCustomerId: string | null };
  ship: ShipAddress;
  items: PricedItem[];
  shippingCents: number;
  insuranceCents: number;
  partnerDiscountCents: number;
  lineDiscountsCents: number[];                       // per item, aligned with items
  credit?: { creditCents: number; taxCents: number }; // store credit + pre-computed tax
};

export type TaxQuoteRequest = {
  ship: ShipAddress; items: PricedItem[]; lineDiscountsCents: number[]; shippingCents: number; insuranceCents: number;
};

export type CheckoutResult =
  | { kind: "redirect"; url: string; sessionId: string; stripeCustomerId: string; couponId: string | null }
  | { kind: "unavailable"; message: string };

// Storefront code only calls this interface. A backup high-risk processor is a
// second adapter; checkout, orders and the webhook contract stay the same.
export interface CommerceAdapter {
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  quoteTax(req: TaxQuoteRequest): Promise<{ calculationId: string; taxCents: number }>;
  // Returns the created Stripe Tax transaction id (for a later reverseTax),
  // or null when Stripe already has a transaction under this reference.
  recordTax(calculationId: string, reference: string): Promise<string | null>;
  // Reverses a previously recorded Tax transaction in full. `reference` is
  // the transaction id recordTax returned (order.tax_calculation_id, once
  // set). Only needed for the store-credit path — Checkout sessions with
  // automatic_tax reverse their own tax transaction on refund.
  reverseTax(reference: string): Promise<void>;
  // Closes a checkout page so it can't be paid. "complete" means the customer
  // already paid it (the paid webhook will record the order); leave it alone.
  expireCheckout(sessionId: string): Promise<"expired" | "complete">;
}

export const CHECKOUT_UNAVAILABLE_MESSAGE = "Checkout opens soon — we'll email you the moment it's live.";
export const STRIPE_MIN_CHARGE_CENTS = 50;

const unavailableAdapter: CommerceAdapter = {
  async createCheckout() {
    return { kind: "unavailable", message: CHECKOUT_UNAVAILABLE_MESSAGE };
  },
  async quoteTax() {
    throw new Error(CHECKOUT_UNAVAILABLE_MESSAGE);
  },
  async recordTax() {
    /* nothing to record without a processor */
    return null;
  },
  async reverseTax() {
    /* nothing to reverse without a processor */
  },
  async expireCheckout() {
    return "expired" as const; /* no processor, no checkout pages */
  },
};

function stripeAddress(ship: ShipAddress) {
  return { line1: ship.line1, line2: ship.line2 ?? undefined, city: ship.city, state: ship.state, postal_code: ship.zip, country: "US" };
}

function line(name: string, amount: number, quantity = 1): Stripe.Checkout.SessionCreateParams.LineItem {
  return { quantity, price_data: { currency: "usd", unit_amount: amount, tax_behavior: "exclusive", product_data: { name } } };
}

const stripeAdapter: CommerceAdapter = {
  async createCheckout(req) {
    const stripe = getStripe();
    const shipping = { name: req.ship.name, address: stripeAddress(req.ship) };
    // Stripe Tax uses the customer's shipping address, so it's set on the customer.
    let stripeCustomerId = req.customer.stripeCustomerId;
    if (stripeCustomerId) {
      await stripe.customers.update(stripeCustomerId, { email: req.customer.email, name: req.customer.fullName, shipping });
    } else {
      stripeCustomerId = (await stripe.customers.create(
        { email: req.customer.email, name: req.customer.fullName, shipping },
        { idempotencyKey: `customer-create-${req.orderId}` },
      )).id;
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      ...req.items.map((i) => line(`${i.compoundName} — ${i.strength}${i.packQty > 1 ? ` · ${i.packQty}-pack` : ""}`, i.unitPriceCents, i.quantity)),
      ...(req.insuranceCents > 0 ? [line("Shipping insurance (transit loss and damage)", req.insuranceCents)] : []),
    ];
    const credit = req.credit;
    if (credit) {
      // Store credit is a payment: tax was computed up front on the full price,
      // so shipping and tax travel as lines and one coupon carries code + credit.
      if (req.shippingCents > 0) lineItems.push(line("Tracked shipping (US)", req.shippingCents));
      if (credit.taxCents > 0) lineItems.push(line("Sales tax", credit.taxCents));
    }

    const couponAmount = req.partnerDiscountCents + (credit?.creditCents ?? 0);
    const couponName = credit ? (req.partnerDiscountCents > 0 ? "Partner code and store credit" : "Store credit") : "Partner code";
    const coupon = couponAmount > 0
      ? await stripe.coupons.create(
          { amount_off: couponAmount, currency: "usd", duration: "once", max_redemptions: 1, name: couponName },
          { idempotencyKey: `coupon-${req.orderId}` },
        )
      : null;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomerId,
      client_reference_id: req.orderNumber,
      metadata: { order_id: req.orderId },
      payment_intent_data: { metadata: { order_id: req.orderId } },
      line_items: lineItems,
      ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
      ...(credit ? {} : {
        shipping_options: [{
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: req.shippingCents === 0 ? "Free tracked shipping (US)" : "Tracked shipping (US)",
            fixed_amount: { amount: req.shippingCents, currency: "usd" },
            tax_behavior: "exclusive",
          },
        }],
      }),
      automatic_tax: { enabled: !credit },
      expires_at: Math.floor(Date.now() / 1000) + 23 * 3600,
      success_url: `${req.siteUrl}/order/${req.orderNumber}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.siteUrl}/checkout`,
    }, { idempotencyKey: `checkout-session-${req.orderId}` });
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return { kind: "redirect", url: session.url, sessionId: session.id, stripeCustomerId, couponId: coupon?.id ?? null };
  },

  async quoteTax(req) {
    // Called while the cart/address is still being edited, before an order
    // exists — there's no order id to key an idempotency key off of, and a
    // cached result would be wrong the moment the cart changes.
    const calc = await getStripe().tax.calculations.create({
      currency: "usd",
      customer_details: { address: stripeAddress(req.ship), address_source: "shipping" },
      line_items: [
        ...req.items.map((i, idx) => ({
          amount: i.lineTotalCents - (req.lineDiscountsCents[idx] ?? 0),
          reference: `${idx}-${i.compoundSlug}-${i.variantId}-${i.packQty}`,
          tax_behavior: "exclusive" as const,
        })),
        ...(req.insuranceCents > 0 ? [{ amount: req.insuranceCents, reference: "insurance", tax_behavior: "exclusive" as const }] : []),
      ],
      shipping_cost: { amount: req.shippingCents, tax_behavior: "exclusive" },
    });
    if (!calc.id) throw new Error("Stripe returned no tax calculation id");
    return { calculationId: calc.id, taxCents: calc.tax_amount_exclusive };
  },

  async recordTax(calculationId, reference) {
    try {
      const tx = await getStripe().tax.transactions.createFromCalculation(
        { calculation: calculationId, reference },
        { idempotencyKey: `tax-tx-${reference}` },
      );
      return tx?.id ?? null;
    } catch (err) {
      // Stripe rejects a reference it has already recorded a transaction
      // under (e.g. a retried afterOrderPaid) — that's already a success.
      const stripeErr = err as { type?: string; message?: string };
      if (stripeErr.type === "StripeInvalidRequestError" && /already/i.test(stripeErr.message ?? "")) return null;
      throw err;
    }
  },

  async reverseTax(reference) {
    await getStripe().tax.transactions.createReversal(
      { mode: "full", original_transaction: reference, reference: `${reference}-refund` },
      { idempotencyKey: `tax-reversal-${reference}` },
    );
  },

  async expireCheckout(sessionId) {
    const stripe = getStripe();
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    if (s.status === "complete") return "complete";
    if (s.status === "open") await stripe.checkout.sessions.expire(sessionId);
    return "expired";
  },
};

export function getCommerceAdapter(): CommerceAdapter {
  return process.env.STRIPE_SECRET_KEY ? stripeAdapter : unavailableAdapter;
}
