import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getOrderById, transitionOrder } from "@/lib/orders";
import { applyPaid } from "@/lib/stripe-events";
import { alertOwner } from "@/lib/notify";

// Daily safety net (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`):
// any Stripe session paid in the last 3 days whose order we never marked paid
// is fixed and reported; expired sessions cancel their pending orders.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const since = Math.floor(Date.now() / 1000) - 3 * 24 * 3600;
  const fixedPaid: string[] = [];
  const cancelled: string[] = [];
  let checked = 0;
  for await (const session of getStripe().checkout.sessions.list({ created: { gte: since }, limit: 100 }) as AsyncIterable<Stripe.Checkout.Session>) {
    checked++;
    const orderId = session.metadata?.order_id;
    const order = orderId ? await getOrderById(orderId) : null;
    if (!order) continue;
    if (session.payment_status === "paid" && (order.status === "awaiting_payment" || order.status === "processing")) {
      if (await applyPaid(order, session)) fixedPaid.push(order.order_number);
    } else if (session.status === "expired" && order.status === "awaiting_payment") {
      if (await transitionOrder(order.id, "awaiting_payment", "cancelled")) cancelled.push(order.order_number);
    }
  }
  if (fixedPaid.length) {
    await alertOwner("Reconciler fixed paid orders", `These paid orders were missing their webhook and have now been recorded: ${fixedPaid.join(", ")}`);
  }
  return NextResponse.json({ checked, fixedPaid, cancelled });
}
