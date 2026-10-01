import "server-only";
import type Stripe from "stripe";
import { getOrderById, getOrderByPaymentIntent, transitionOrder, type OrderRow } from "@/lib/orders";
import { achFailedEmail } from "@/lib/emails";
import { alertOwner, sendOrAlert } from "@/lib/notify";
import { afterOrderPaid } from "@/lib/order-paid";
import { getCommerceAdapter } from "@/lib/commerce";
import { refundCredit, reverseCommission } from "@/lib/partners/ledger";
import { getPartnerById } from "@/lib/partners/data";

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
    await alertOwner(`Payment received for a ${order.status} order (${order.order_number})`,
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
    await alertOwner(`Commission not reversed for ${order.order_number}`, String(err));
  }
  if (order.store_credit_cents > 0) {
    try {
      await refundCredit(order.customer_id, order.store_credit_cents, order.id);
    } catch (err) {
      await alertOwner(`Store credit not refunded for ${order.order_number}`, String(err));
    }
  }
  // Automatic-tax Checkout sessions (card path) reverse their own tax
  // transaction on refund; only the store-credit path needs this, and
  // only once a transaction id has actually been recorded.
  if (order.tax_transaction_id) {
    try {
      await getCommerceAdapter().reverseTax(order.tax_transaction_id);
    } catch (err) {
      await alertOwner(`Tax transaction not reversed for ${order.order_number}`, String(err));
    }
  }
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
      if (!charge.refunded || !pi) return; // partial refunds leave the order as is
      const order = await getOrderByPaymentIntent(pi);
      if (!order) return;
      // Already refunded means a prior delivery of this event got the order
      // transitioned but (per one of the alerts below) didn't finish every
      // follow-up step — run them again; each one is idempotent.
      let refunded = order.status === "refunded";
      if (!refunded && (order.status === "paid" || order.status === "shipped")) {
        refunded = await transitionOrder(order.id, order.status, "refunded");
      }
      if (!refunded) return;
      await afterOrderRefunded(order);
      return;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const pi = paymentIntentId(dispute.payment_intent);
      if (!pi) return;
      // Stripe can deliver a dispute before (or alongside) the paid event.
      // Throwing makes Stripe retry, and the webhook route alerts the owner
      // now; the retry reverses the commission and sends the alert below.
      const order = await getOrderByPaymentIntent(pi);
      if (!order) throw new Error(`dispute on ${pi}: no order matched yet`);
      const reversed = await reverseCommission(order.id, "chargeback");
      if (reversed === "none" && order.partner_id && order.attributed_by) {
        const partner = await getPartnerById(order.partner_id);
        if (partner?.status === "approved") throw new Error(`dispute on ${order.order_number}: commission not recorded yet`);
      }
      await alertOwner(`Chargeback opened on ${order.order_number}`, `Order ${order.order_number} · reason: ${dispute.reason}. Respond in the Stripe dashboard with the order, tracking and agreement records.`);
      return;
    }
    default:
      return;
  }
}
