import "server-only";
import type Stripe from "stripe";
import { getOrderById, getOrderByPaymentIntent, transitionOrder, type OrderRow } from "@/lib/orders";
import { achFailedEmail } from "@/lib/emails";
import { alertOwner, sendOrAlert } from "@/lib/notify";
import { afterOrderPaid } from "@/lib/order-paid";
import { refundCredit, reverseCommission } from "@/lib/partners/ledger";

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
  if (order.status !== "awaiting_payment" && order.status !== "processing") return false;
  const patch = order.tax_calculation_id
    ? { stripe_payment_intent: paymentIntentId(session.payment_intent) }
    : { tax_cents: session.total_details?.amount_tax ?? 0, total_cents: session.amount_total ?? order.total_cents, stripe_payment_intent: paymentIntentId(session.payment_intent) };
  if (!(await transitionOrder(order.id, order.status, "paid", patch))) return false;
  await afterOrderPaid(order.id);
  return true;
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
      if (order && (order.status === "paid" || order.status === "shipped")) {
        if (await transitionOrder(order.id, order.status, "refunded")) {
          await reverseCommission(order.id, "refund");
          if (order.store_credit_cents > 0) await refundCredit(order.customer_id, order.store_credit_cents, order.id);
        }
      }
      return;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const pi = paymentIntentId(dispute.payment_intent);
      const order = pi ? await getOrderByPaymentIntent(pi) : null;
      if (!order) return;
      await reverseCommission(order.id, "chargeback");
      await alertOwner(`Chargeback opened on ${order.order_number}`, `Order ${order.order_number} · reason: ${dispute.reason}. Respond in the Stripe dashboard with the order, tracking and agreement records.`);
      return;
    }
    default:
      return;
  }
}
