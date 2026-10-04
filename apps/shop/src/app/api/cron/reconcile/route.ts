import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getOrderById, listOrphanedPendingOrders, transitionOrder } from "@/lib/orders";
import { applyPaid } from "@/lib/stripe-events";
import { alertOwner } from "@/lib/notify";
import { pruneLookups } from "@/lib/account/data";

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
  const failed: string[] = [];
  let checked = 0;
  try {
    for await (const session of getStripe().checkout.sessions.list({ created: { gte: since }, limit: 100 }) as AsyncIterable<Stripe.Checkout.Session>) {
      checked++;
      try {
        const orderId = session.metadata?.order_id;
        const order = orderId ? await getOrderById(orderId) : null;
        if (!order) continue;
        if (session.payment_status === "paid" && (order.status === "awaiting_payment" || order.status === "processing")) {
          if (await applyPaid(order, session)) fixedPaid.push(order.order_number);
        } else if (session.status === "expired" && order.status === "awaiting_payment") {
          if (await transitionOrder(order.id, "awaiting_payment", "cancelled")) cancelled.push(order.order_number);
        }
      } catch (err) {
        // One bad session must not abort the run for the rest — record it and keep going.
        const orderId = session.metadata?.order_id;
        const message = err instanceof Error ? err.message : String(err);
        failed.push(`${session.id}${orderId ? ` (order ${orderId})` : ""}: ${message}`);
      }
    }
  } catch (err) {
    // The list call (or fetching a later page) itself failed — nothing below ran.
    const message = err instanceof Error ? err.message : String(err);
    await alertOwner("Reconcile: failed to list Stripe sessions", message);
    return NextResponse.json({ error: "list failed" }, { status: 500 });
  }
  // Orders whose checkout died before Stripe gave them a page: nothing will
  // ever expire them, and any store credit they hold stays held until cancelled.
  try {
    for (const o of await listOrphanedPendingOrders(new Date(Date.now() - 60 * 60 * 1000).toISOString())) {
      if (await transitionOrder(o.id, "awaiting_payment", "cancelled")) cancelled.push(o.order_number);
    }
  } catch (err) {
    failed.push(`orphaned pending orders: ${err instanceof Error ? err.message : String(err)}`);
  }
  // Email-check rate-limit rows older than two days are no longer needed.
  try {
    await pruneLookups();
  } catch (err) {
    failed.push(`gate lookups prune: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (fixedPaid.length) {
    await alertOwner("Reconciler fixed paid orders", `These paid orders were missing their webhook and have now been recorded: ${fixedPaid.join(", ")}`);
  }
  if (failed.length) {
    await alertOwner(`Reconcile: ${failed.length} session${failed.length === 1 ? "" : "s"} failed`, failed.join("\n"));
  }
  return NextResponse.json({ checked, fixedPaid, cancelled, failed });
}
