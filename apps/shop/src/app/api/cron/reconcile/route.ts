import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getOrderById, listOrphanedPendingOrders, transitionOrder } from "@/lib/orders";
import { applyPaid } from "@/lib/stripe-events";
import { alertOwner } from "@/lib/notify";
import { pruneLookups } from "@/lib/account/data";
import { pruneCodeAttempts } from "@/lib/discounts/data";
import { lotIntegrity } from "@/lib/catalog-ops/data";
import { currentMs } from "@/lib/clock";
import { logDisputeEvent, markReminded, openDisputes } from "@/lib/disputes/data";
import { dueReminder, evidenceChip, reasonLabel } from "@/lib/disputes/rules";
import { shortDate } from "@/lib/discounts/time";
import { autoCloseInquiries } from "@/lib/inquiries/data";

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
        const missedPaid = session.payment_status === "paid" && (
          order.status === "awaiting_payment" || order.status === "processing"
          || (order.channel === "wholesale" && order.status === "balance_due" && session.metadata?.payment === "balance"));
        if (missedPaid) {
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
  // Old discount-code tries (the wrong-code rate limit) are no longer needed.
  try {
    await pruneCodeAttempts();
  } catch (err) {
    failed.push(`code attempts prune: ${err instanceof Error ? err.message : String(err)}`);
  }
  // Stock integrity: a lot gone below zero or vials still held on a finished
  // order means the numbers are wrong somewhere — never silent.
  try {
    const s = await lotIntegrity();
    const lines = [
      s.negative.length ? `Lots below zero: ${s.negative.join(", ")}` : "",
      s.stale_holds.length ? `Held vials on finished orders: ${s.stale_holds.join(", ")}` : "",
    ].filter(Boolean);
    if (lines.length) await alertOwner("Reconcile: stock needs a look", lines.join("\n"));
  } catch (err) {
    failed.push(`lot integrity: ${err instanceof Error ? err.message : String(err)}`);
  }
  // Chargeback deadlines: one alert DISPUTE_REMIND_DAYS before an unsubmitted
  // deadline, each sent once (recorded on the dispute and in its activity).
  try {
    const nowMs = currentMs();
    for (const d of await openDisputes()) {
      const r = dueReminder(d, nowMs);
      if (!r) continue;
      const left = r.daysLeft === 0 ? "due today" : `${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"} left`;
      await alertOwner("Chargeback response due soon",
        `${d.order.number} · ${reasonLabel(d.reason)} · ${left} (respond by ${shortDate(d.evidence_due_by!)}) · ${evidenceChip(d).text.toLowerCase()}. Open Disputes to review and submit the evidence.`);
      await markReminded(d.id, r.marks);
      await logDisputeEvent({ disputeId: d.id, action: "reminder", note: left, key: `reminder:${r.day}:${d.id}` });
    }
  } catch (err) {
    failed.push(`dispute reminders: ${err instanceof Error ? err.message : String(err)}`);
  }
  // Inquiries waiting on the customer for INQUIRY_AUTO_CLOSE_DAYS close (a
  // later reply re-opens them). Logged on each thread as "Closed automatically".
  let inquiriesClosed = 0;
  try {
    inquiriesClosed = await autoCloseInquiries(currentMs());
  } catch (err) {
    failed.push(`inquiry auto-close: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (fixedPaid.length) {
    await alertOwner("Reconciler fixed paid orders", `These paid orders were missing their webhook and have now been recorded: ${fixedPaid.join(", ")}`);
  }
  if (failed.length) {
    await alertOwner("Reconcile had failures", `${failed.length} failed:\n${failed.join("\n")}`);
  }
  return NextResponse.json({ checked, fixedPaid, cancelled, failed, inquiriesClosed });
}
