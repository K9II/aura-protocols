"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { recordAdminEvent } from "@/lib/audit/data";
import { getOrderById, transitionOrder } from "@/lib/orders";
import { CARRIERS, shippedEmail } from "@/lib/emails";
import { alertOwner, sendOrAlert } from "@/lib/notify";
import { markCommissionClearing } from "@/lib/partners/ledger";
import { afterOrderRefunded } from "@/lib/stripe-events";
import { orderItemLots, recordShipped } from "@/lib/catalog-ops/data";
import { catalogStockChanged } from "@/lib/catalog-live";

const schema = z.object({
  orderId: z.string().uuid(),
  tracking: z.string().transform((s) => s.replace(/\s+/g, "").toUpperCase()).pipe(z.string().regex(/^[A-Z0-9]{8,40}$/)),
  carrier: z.enum(CARRIERS),
});

export async function markShippedAction(form: FormData): Promise<void> {
  const owner = await requireOwner();
  const parsed = schema.safeParse({ orderId: form.get("orderId"), tracking: form.get("tracking"), carrier: form.get("carrier") });
  if (!parsed.success) return;
  const { orderId, tracking, carrier } = parsed.data;
  const order = await getOrderById(orderId);
  if (!order || order.status !== "paid") return;
  if (await transitionOrder(orderId, "paid", "shipped", { tracking_number: tracking, carrier })) {
    await recordAdminEvent({ area: "orders", action: "order_shipped", targetId: orderId, label: order.order_number, detail: `${carrier.toUpperCase()} ${tracking}`, actorId: owner.id });
    try {
      await markCommissionClearing(orderId, new Date().toISOString());
    } catch (err) {
      await alertOwner("Commission not cleared at shipping", `${order.order_number}: ${String(err)}`);
    }
    // Each line's held/sold lots become its shipped record. A line already
    // recorded (e.g. a retry) is left alone. One line's failure is reported
    // by name and doesn't stop the others — a loud per-line alert, not a
    // silently half-recorded shipment.
    try {
      const lots = await orderItemLots((order.order_items ?? []).map((i) => i.id));
      for (const [itemId, l] of lots) {
        if (!l.allocated.length || l.shipped.length) continue;
        try {
          const result = await recordShipped(itemId, l.allocated, "manual");
          if (result === "alert") {
            await alertOwner("Shipped lots don't match what was held", `${order.order_number} · line ${itemId}: lots shipped don't match lots held`);
          } else if (result === "moved") {
            catalogStockChanged();
          }
        } catch (err) {
          await alertOwner("Shipped lots not recorded", `${order.order_number} · line ${itemId}: ${String(err)}`);
        }
      }
    } catch (err) {
      await alertOwner("Shipped lots not recorded", `${order.order_number}: ${String(err)}`);
    }
    const shipped = (await getOrderById(orderId)) ?? { ...order, tracking_number: tracking, carrier };
    await sendOrAlert({ to: shipped.email, ...shippedEmail(shipped) }, `shipped ${shipped.order_number}`);
  }
  revalidatePath("/admin/orders");
}

// An order paid entirely in store credit never reached Stripe, so there is no
// Stripe refund to trigger the usual follow-ups. This refunds it here: the
// credit goes back to the customer, the commission is reversed, tax undone.
export async function refundCreditOrderAction(form: FormData): Promise<void> {
  const owner = await requireOwner();
  const parsed = z.object({ orderId: z.string().uuid() }).safeParse({ orderId: form.get("orderId") });
  if (!parsed.success) return;
  const order = await getOrderById(parsed.data.orderId);
  if (!order || order.stripe_session_id || order.store_credit_cents !== order.total_cents) return;
  if (order.status !== "paid" && order.status !== "shipped") return;
  if (await transitionOrder(order.id, order.status, "refunded")) {
    await recordAdminEvent({ area: "orders", action: "order_refunded", targetId: order.id, label: order.order_number, detail: "store credit returned", actorId: owner.id });
    await afterOrderRefunded(order);
  }
  revalidatePath("/admin/orders");
}
