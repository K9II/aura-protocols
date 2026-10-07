import "server-only";
import type Stripe from "stripe";
import { getOrderById, getOrderByPaymentIntent, transitionOrder, type OrderRow } from "@/lib/orders";
import { achFailedEmail } from "@/lib/emails";
import { alertOwner, sendOrAlert } from "@/lib/notify";
import { afterOrderPaid } from "@/lib/order-paid";
import { getCommerceAdapter } from "@/lib/commerce";
import { refundCredit, reverseCommission } from "@/lib/partners/ledger";
import { getPartnerById } from "@/lib/partners/data";
import { usd } from "@/lib/html";
import { shortDate } from "@/lib/discounts/time";
import { closedNote, efwSuggestion, fraudTypeLabel, reasonLabel } from "@/lib/disputes/rules";
import { disputeParams, eventAt, feeCents, idOf, warningParams } from "@/lib/disputes/stripe-map";
import { hasDisputeForCharge, logDisputeEvent, recordDispute, recordDisputeCard, recordFunds, recordWarning, resolveWarningsForCharge } from "@/lib/disputes/data";
import { fetchChargeInfo } from "@/lib/disputes/stripe";

function paymentIntentId(pi: string | { id: string } | null | undefined): string | null {
  return typeof pi === "string" ? pi : pi?.id ?? null;
}

async function orderForSession(session: Stripe.Checkout.Session): Promise<OrderRow> {
  const id = session.metadata?.order_id;
  const order = id ? await getOrderById(id) : null;
  if (!order) throw new Error(`order ${id ?? "(no metadata)"} not found for session ${session.id}`);
  return order;
}

// Marks an order paid (card/wallet immediately, bank payment once it clears)
// then runs the after-payment steps. Safe to call twice. Store-credit orders
// keep their pre-computed tax and total (Stripe only saw the remainder).
export async function applyPaid(order: OrderRow, session: Stripe.Checkout.Session): Promise<boolean> {
  if (order.status === "cancelled" || order.status === "refunded") {
    // Money arrived for an order we already closed (e.g. its Stripe page
    // outlived a failed checkout). Nothing is shipped automatically.
    await alertOwner("Payment received for a closed order",
      `Stripe session ${session.id} was paid but order ${order.order_number} (${order.id}) is ${order.status}. Refund it in Stripe, or reinstate and ship the order by hand.`);
    return false;
  }
  if (order.status !== "awaiting_payment" && order.status !== "processing") return false;
  const patch = order.tax_calculation_id
    ? { stripe_payment_intent: paymentIntentId(session.payment_intent) }
    : { tax_cents: session.total_details?.amount_tax ?? 0, total_cents: session.amount_total ?? order.total_cents, stripe_payment_intent: paymentIntentId(session.payment_intent) };
  if (!(await transitionOrder(order.id, order.status, "paid", patch))) return false;
  await afterOrderPaid(order.id);
  return true;
}

// Follow-ups once an order is refunded (by Stripe, or by the owner for an
// order paid entirely in store credit). Each step is idempotent and alerts
// the owner on failure without stopping the others.
export async function afterOrderRefunded(order: OrderRow): Promise<void> {
  try {
    await reverseCommission(order.id, "refund");
  } catch (err) {
    await alertOwner("Commission not reversed", `${order.order_number}: ${String(err)}`);
  }
  if (order.store_credit_cents > 0) {
    try {
      await refundCredit(order.customer_id, order.store_credit_cents, order.id);
    } catch (err) {
      await alertOwner("Store credit not refunded", `${order.order_number}: ${String(err)}`);
    }
  }
  // Automatic-tax Checkout sessions (card path) reverse their own tax
  // transaction on refund; only the store-credit path needs this, and
  // only once a transaction id has actually been recorded.
  if (order.tax_transaction_id) {
    try {
      await getCommerceAdapter().reverseTax(order.tax_transaction_id);
    } catch (err) {
      await alertOwner("Tax transaction not reversed", `${order.order_number}: ${String(err)}`);
    }
  }
}

// ---------- chargebacks and early fraud warnings (spec 2026-10-05-admin-disputes-design.md) ----------
// A dispute or warning can be delivered before the paid event: throwing makes
// Stripe retry, and the webhook route alerts the owner now. Every write below
// is idempotent (upsert by Stripe id, keyed activity entries), so a retry
// after a partial failure never duplicates anything.
async function disputedOrder(d: Stripe.Dispute): Promise<OrderRow | null> {
  const pi = paymentIntentId(d.payment_intent);
  if (!pi) {
    await alertOwner("Chargeback has no payment intent", `Dispute ${d.id} on charge ${idOf(d.charge) ?? "(none)"} (${usd(d.amount)}) has no payment_intent; it can't be matched to an order. Handle it in Stripe.`);
    return null;
  }
  const order = await getOrderByPaymentIntent(pi);
  if (!order) throw new Error(`dispute on ${pi}: no order matched yet`);
  return order;
}

async function onDisputeOpened(event: Stripe.Event, dispute: Stripe.Dispute): Promise<void> {
  const order = await disputedOrder(dispute);
  if (!order) return;
  const id = await recordDispute(disputeParams(dispute, order.id, eventAt(event)));
  await logDisputeEvent({ disputeId: id, action: "opened", note: dispute.reason, key: `opened:${dispute.id}` });
  const charge = idOf(dispute.charge);
  if (charge) {
    await recordDisputeCard(id, await fetchChargeInfo(charge));
    await resolveWarningsForCharge(charge);
  }
  const reversed = await reverseCommission(order.id, "chargeback");
  if (reversed === "none" && order.partner_id && order.attributed_by) {
    const partner = await getPartnerById(order.partner_id);
    if (partner?.status === "approved") throw new Error(`dispute on ${order.order_number}: commission not recorded yet`);
  }
  const due = dispute.evidence_details?.due_by ? ` · respond by ${shortDate(new Date(dispute.evidence_details.due_by * 1000).toISOString())}` : "";
  await alertOwner("Chargeback opened", `Order ${order.order_number} · ${reasonLabel(dispute.reason)} · ${usd(dispute.amount)}${due}. The evidence is ready in Disputes: review it, then submit it to Stripe before the deadline.`);
}

async function onDisputeChanged(event: Stripe.Event, dispute: Stripe.Dispute): Promise<void> {
  const order = await disputedOrder(dispute);
  if (!order) return;
  const at = eventAt(event);
  const id = await recordDispute(disputeParams(dispute, order.id, at));
  if (event.type === "charge.dispute.funds_withdrawn") {
    await recordFunds(id, "withdrawn", at);
    await logDisputeEvent({ disputeId: id, action: "funds_withdrawn", note: `${usd(dispute.amount)} + ${usd(feeCents(dispute))} fee`, key: `funds_withdrawn:${dispute.id}` });
  } else if (event.type === "charge.dispute.funds_reinstated") {
    await recordFunds(id, "reinstated", at);
    await logDisputeEvent({ disputeId: id, action: "funds_reinstated", note: usd(dispute.amount), key: `funds_reinstated:${dispute.id}` });
  } else if (event.type === "charge.dispute.closed") {
    const note = closedNote(dispute.status, dispute.amount);
    await logDisputeEvent({ disputeId: id, action: "closed", note, key: `closed:${dispute.id}` });
    await alertOwner("Chargeback decided", `Order ${order.order_number} · ${note}. See it in Disputes.`);
  }
}

async function onEarlyFraudWarning(event: Stripe.Event, w: Stripe.Radar.EarlyFraudWarning): Promise<void> {
  const charge = idOf(w.charge);
  const pi = paymentIntentId(w.payment_intent) ?? (charge ? (await fetchChargeInfo(charge)).paymentIntent : null);
  if (!pi) {
    await alertOwner("Early fraud warning has no payment intent", `Warning ${w.id} on charge ${charge ?? "(none)"} has no payment intent; it can't be matched to an order. Handle it in Stripe.`);
    return;
  }
  const order = await getOrderByPaymentIntent(pi);
  if (!order) throw new Error(`early fraud warning on ${pi}: no order matched yet`);
  await recordWarning(warningParams(w, order.id));
  // A chargeback already opened on this charge: the warning is moot, so
  // close it the same way a later-arriving dispute would (never leaves a
  // refund button up for something that's already a full chargeback).
  if (charge && (await hasDisputeForCharge(charge))) {
    await resolveWarningsForCharge(charge);
    return;
  }
  if (event.type !== "radar.early_fraud_warning.created") return;
  const s = efwSuggestion({ status: order.status, shippedAt: order.shipped_at });
  await alertOwner("Early fraud warning", `Order ${order.order_number} · ${fraudTypeLabel(w.fraud_type)} · ${usd(order.total_cents - order.store_credit_cents)} · ${s.alert}`);
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const order = await orderForSession(session);
      if (session.payment_status === "paid") await applyPaid(order, session);
      else if (order.status === "awaiting_payment") {
        await transitionOrder(order.id, "awaiting_payment", "processing", { stripe_payment_intent: paymentIntentId(session.payment_intent) });
      }
      return;
    }
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      await applyPaid(await orderForSession(session), session);
      return;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const order = await orderForSession(session);
      if (order.status === "awaiting_payment" || order.status === "processing") {
        if (await transitionOrder(order.id, order.status, "cancelled")) {
          await sendOrAlert({ to: order.email, ...achFailedEmail(order) }, `ach failed ${order.order_number}`);
        }
      }
      return;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const order = await orderForSession(session);
      if (order.status === "awaiting_payment") await transitionOrder(order.id, "awaiting_payment", "cancelled");
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi = paymentIntentId(charge.payment_intent);
      if (!pi) return;
      const order = await getOrderByPaymentIntent(pi);
      // A refund can be delivered before the paid event: retry rather than
      // drop it, or reconcile could later mark a refunded sale paid.
      if (!order) throw new Error(`refund on ${pi}: no order matched yet`);
      if (!charge.refunded) {
        // Partial refunds leave the order (and the commission) as is.
        await alertOwner("Partial refund in Stripe",
          `${usd(charge.amount_refunded ?? 0)} of order ${order.order_number} was refunded in Stripe. The order stays ${order.status} and the partner commission (if any) is unchanged - adjust it by hand if needed.`);
        return;
      }
      // Already refunded means a prior delivery of this event got the order
      // transitioned but (per one of the alerts below) didn't finish every
      // follow-up step — run them again; each one is idempotent.
      let refunded = order.status === "refunded";
      // Refunded to store credit from the admin (a shipped exception), then
      // the card refunded in the Stripe dashboard too: the customer got it twice.
      if (refunded && order.refund_destination === "store_credit" && order.stripe_payment_intent && order.total_cents > order.store_credit_cents) {
        await alertOwner("Refunded twice", `${order.order_number}: refunded to store credit here and to the card in Stripe — take the store credit back in Customers.`);
      }
      if (!refunded && (order.status === "paid" || order.status === "shipped")) {
        refunded = await transitionOrder(order.id, order.status, "refunded");
      }
      if (!refunded) return;
      await afterOrderRefunded(order);
      return;
    }
    case "charge.dispute.created":
      await onDisputeOpened(event, event.data.object as Stripe.Dispute);
      return;
    case "charge.dispute.updated":
    case "charge.dispute.closed":
    case "charge.dispute.funds_withdrawn":
    case "charge.dispute.funds_reinstated":
      await onDisputeChanged(event, event.data.object as Stripe.Dispute);
      return;
    case "radar.early_fraud_warning.created":
    case "radar.early_fraud_warning.updated":
      await onEarlyFraudWarning(event, event.data.object as Stripe.Radar.EarlyFraudWarning);
      return;
    default:
      return;
  }
}
