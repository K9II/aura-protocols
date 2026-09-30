"use server";

import { z } from "zod";
import { getCustomer } from "@/lib/dal";
import { priceOrder, type Rejection } from "@/lib/pricing";
import { shipAddressSchema } from "@/lib/ship-address";
import { attachCheckoutSession, createPendingOrder, saveShipAddress, saveStripeCustomerId, transitionOrder } from "@/lib/orders";
import { getCommerceAdapter } from "@/lib/commerce";
import { siteUrl } from "@/lib/supabase/env";

export type StartCheckoutResult = { url?: string; error?: string; rejected?: Rejection[] };

const schema = z.object({
  lines: z.array(z.object({
    slug: z.string().max(100), variantId: z.string().max(50),
    packQty: z.number().int(), quantity: z.number().int(),
  })).min(1).max(50),
  ship: shipAddressSchema,
  ruoConfirmed: z.literal(true),
});

export async function startCheckoutAction(input: unknown): Promise<StartCheckoutResult> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in to check out." };
  if (!customer.emailConfirmed) return { error: "Please verify your email first — check your inbox for the link." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Please complete the shipping address and confirm research use." };
  const { lines, ship } = parsed.data;

  const priced = priceOrder(lines);
  if (priced.rejected.length) return { error: "Some items can't be ordered right now — they've been flagged below.", rejected: priced.rejected };
  if (priced.items.length === 0) return { error: "Your cart is empty." };

  await saveShipAddress(customer.id, ship);
  const order = await createPendingOrder({ customerId: customer.id, email: customer.email, ship, priced });
  try {
    const result = await getCommerceAdapter().createCheckout({
      orderId: order.id, orderNumber: order.orderNumber, siteUrl: siteUrl(),
      customer: { email: customer.email, fullName: customer.fullName, stripeCustomerId: customer.stripeCustomerId },
      ship, items: priced.items, shippingCents: priced.shippingCents, insuranceCents: priced.insuranceCents,
    });
    if (result.kind === "unavailable") {
      await transitionOrder(order.id, "awaiting_payment", "cancelled");
      return { error: result.message };
    }
    await attachCheckoutSession(order.id, result.sessionId);
    if (!customer.stripeCustomerId) await saveStripeCustomerId(customer.id, result.stripeCustomerId);
    return { url: result.url };
  } catch (err) {
    console.error("checkout start failed:", err);
    await transitionOrder(order.id, "awaiting_payment", "cancelled");
    return { error: "We couldn't start payment — please try again." };
  }
}
