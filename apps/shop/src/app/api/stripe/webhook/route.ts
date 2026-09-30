import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { beginStripeEvent, finishStripeEvent } from "@/lib/orders";
import { handleStripeEvent } from "@/lib/stripe-events";
import { alertOwner } from "@/lib/notify";

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const body = await request.text(); // raw body — required for signature verification
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if ((await beginStripeEvent(event.id, event.type)) === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  try {
    await handleStripeEvent(event);
    await finishStripeEvent(event.id);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`stripe event ${event.id} failed:`, err);
    await finishStripeEvent(event.id, String(err));
    await alertOwner(`Stripe event failed: ${event.type}`, `${event.id}\n${String(err)}`);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
