import "server-only";
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
};

export type CheckoutResult =
  | { kind: "redirect"; url: string; sessionId: string; stripeCustomerId: string }
  | { kind: "unavailable"; message: string };

// Storefront code only calls this interface. A backup high-risk processor is a
// second adapter; checkout, orders and the webhook contract stay the same.
export interface CommerceAdapter {
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
}

export const CHECKOUT_UNAVAILABLE_MESSAGE = "Checkout opens soon — we'll email you the moment it's live.";

const unavailableAdapter: CommerceAdapter = {
  async createCheckout() {
    return { kind: "unavailable", message: CHECKOUT_UNAVAILABLE_MESSAGE };
  },
};

const stripeAdapter: CommerceAdapter = {
  async createCheckout(req) {
    const stripe = getStripe();
    const shipping = {
      name: req.ship.name,
      address: { line1: req.ship.line1, line2: req.ship.line2 ?? undefined, city: req.ship.city, state: req.ship.state, postal_code: req.ship.zip, country: "US" },
    };
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
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomerId,
      client_reference_id: req.orderNumber,
      metadata: { order_id: req.orderId },
      payment_intent_data: { metadata: { order_id: req.orderId } },
      line_items: [
        ...req.items.map((i) => ({
          quantity: i.quantity,
          price_data: {
            currency: "usd",
            unit_amount: i.unitPriceCents,
            tax_behavior: "exclusive" as const,
            product_data: { name: `${i.compoundName} — ${i.strength}${i.packQty > 1 ? ` · ${i.packQty}-pack` : ""}` },
          },
        })),
        ...(req.insuranceCents > 0 ? [{
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: req.insuranceCents,
            tax_behavior: "exclusive" as const,
            product_data: { name: "Shipping insurance (transit loss and damage)" },
          },
        }] : []),
      ],
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: req.shippingCents === 0 ? "Free tracked shipping (US)" : "Tracked shipping (US)",
          fixed_amount: { amount: req.shippingCents, currency: "usd" },
          tax_behavior: "exclusive",
        },
      }],
      automatic_tax: { enabled: true },
      expires_at: Math.floor(Date.now() / 1000) + 23 * 3600,
      success_url: `${req.siteUrl}/order/${req.orderNumber}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.siteUrl}/checkout`,
    }, { idempotencyKey: `checkout-session-${req.orderId}` });
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return { kind: "redirect", url: session.url, sessionId: session.id, stripeCustomerId };
  },
};

export function getCommerceAdapter(): CommerceAdapter {
  return process.env.STRIPE_SECRET_KEY ? stripeAdapter : unavailableAdapter;
}
