import "server-only";
import type Stripe from "stripe";
import { getOrderById, getOrderByPaymentIntent, transitionOrder, type OrderRow } from "@/lib/orders";
import { achFailedEmail, orderConfirmationEmail, ownerNewOrderEmail } from "@/lib/emails";
import { alertAddress, alertOwner, sendOrAlert } from "@/lib/notify";

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  return typeof pi === "string" ? pi : pi?.id ?? null;
}

async function orderForSession(session: Stripe.Checkout.Session): Promise<OrderRow> {
  const id = session.metadata?.order_id;
  const order = id ? await getOrderById(id) : null;
  if (!order) throw new Error(`order ${id ?? "(no metadata)"} not found for session ${session.id}`);
  return order;
}

// Marks an order paid (card/wallet immediately, bank payment once it clears)
// and sends the confirmation + owner alert. Safe to call twice.
export async function applyPaid(order: OrderRow, session: Stripe.Checkout.Session): Promise<boolean> {
  if (order.status !== "awaiting_payment" && order.status !== "processing") return false;
  const moved = await transitionOrder(order.id, order.status, "paid", {
    tax_cents: session.total_details?.amount_tax ?? 0,
    total_cents: session.amount_total ?? order.total_cents,
    stripe_payment_intent: paymentIntentId(session),
  });
  if (!moved) return false;
  const paid = (await getOrderById(order.id)) ?? order;
  await sendOrAlert({ to: paid.email, ...orderConfirmationEmail(paid) }, `order ${paid.order_number}`);
  const owner = alertAddress();
  if (owner) await sendOrAlert({ to: owner, ...ownerNewOrderEmail(paid) }, `owner alert ${paid.order_number}`);
  return true;
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const order = await orderForSession(session);
      if (session.payment_status === "paid") await applyPaid(order, session);
      else if (order.status === "awaiting_payment") {
        await transitionOrder(order.id, "awaiting_payment", "processing", { stripe_payment_intent: paymentIntentId(session) });
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
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (!charge.refunded || !pi) return; // partial refunds leave the order as is
      const order = await getOrderByPaymentIntent(pi);
      if (order && (order.status === "paid" || order.status === "shipped")) await transitionOrder(order.id, order.status, "refunded");
      return;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const pi = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
      if (!pi) return;
      const order = await getOrderByPaymentIntent(pi);
      if (!order) return;
      // A dispute doesn't move the fulfillment status machine — owner alert only.
      await alertOwner(
        `Dispute opened on order ${order.order_number}`,
        `Order ${order.order_number} (${order.email}) — reason: ${dispute.reason}, amount: ${dispute.amount}`,
      );
      return;
    }
    default:
      return;
  }
}
