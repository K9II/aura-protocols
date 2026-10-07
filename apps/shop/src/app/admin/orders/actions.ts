"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { recordAdminEvent } from "@/lib/audit/data";
import { getOrderById, transitionOrder } from "@/lib/orders";
import { CARRIERS, shippedEmail } from "@/lib/emails";
import { alertOwner, sendOrAlert } from "@/lib/notify";
import { markCommissionClearing } from "@/lib/partners/ledger";
import { afterOrderRefunded } from "@/lib/stripe-events";
import { holdVials, orderItemLots, recordShipped, type HoldResult } from "@/lib/catalog-ops/data";
import { catalogStockChanged } from "@/lib/catalog-live";
import { afterOrderPaid } from "@/lib/order-paid";
import { shipAddressSchema } from "@/lib/ship-address";
import { usd } from "@/lib/html";
import { createNoChargeOrder, orderByNoChargeKey, orderIdByNumber, recipient, stockOptions } from "@/lib/no-charge/data";
import { buildLines, NoChargeCreateError, parseNoCharge, REASON_LABEL, summary, type NoChargeErrors } from "@/lib/no-charge/rules";

const schema = z.object({
  orderId: z.string().uuid(),
  tracking: z.string().transform((s) => s.replace(/\s+/g, "").toUpperCase()).pipe(z.string().regex(/^[A-Z0-9]{8,40}$/)),
  carrier: z.enum(CARRIERS),
});

// The Ship dialog's state (useActionState).
export type ShipState = { ok: true } | { error: string; field?: "tracking" } | null;

export async function markShippedAction(_prev: ShipState, form: FormData): Promise<ShipState> {
  const owner = await requirePermission("orders.ship");
  const parsed = schema.safeParse({ orderId: form.get("orderId"), tracking: form.get("tracking"), carrier: form.get("carrier") });
  if (!parsed.success) {
    return parsed.error.issues.some((i) => i.path[0] === "tracking") ? { error: "Use 8–40 letters and numbers.", field: "tracking" } : { error: "Choose a carrier and try again." };
  }
  const { orderId, tracking, carrier } = parsed.data;
  const order = await getOrderById(orderId);
  if (!order || order.status !== "paid") return { error: "This order is no longer waiting to ship." };
  if (!(await transitionOrder(orderId, "paid", "shipped", { tracking_number: tracking, carrier }))) return { error: "This order is no longer waiting to ship." };
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
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.order_number}`);
  revalidatePath("/admin/partners/[id]", "page");
  return { ok: true };
}

// An order paid entirely in store credit never reached Stripe, so there is no
// Stripe refund to trigger the usual follow-ups. This refunds it here: the
// credit goes back to the customer, the commission is reversed, tax undone.
export async function refundCreditOrderAction(form: FormData): Promise<void> {
  const owner = await requirePermission("orders.refund_credit");
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
  revalidatePath(`/admin/orders/${order.order_number}`);
  revalidatePath("/admin/partners/[id]", "page");
}

// ---------- no-charge orders (seeding, replacement, sample) ----------
// The New no-charge order form's state (useActionState). On success the
// action redirects to the new order instead of returning. `key` is a fresh
// one-time form key, sent back once the old one was used by an order that
// was then cancelled.
export type NoChargeState = { errors?: NoChargeErrors & { form?: string }; key?: string } | null;

const CANT_RECEIVE = "That customer can't receive orders. Pick someone else.";
const NOT_RESERVED = "Stock couldn't be reserved. Nothing was sent — try again.";
const NOT_AVAILABLE = "One of these strengths is no longer available — reload the page.";
const STALE_FORM = "This form is out of date — reload the page.";

function joinNames(names: string[]): string {
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// Creates the order, holds its vials (oldest live lot first, all or
// nothing), moves it to paid and runs the no-charge paid steps. Money
// fields are all 0, so it never counts as a sale. The form's one-time `key`
// makes a double submit open the first order instead of creating a second.
// Anything failing before paid cancels the order (releasing any hold) and
// says nothing was sent; a cancel that fails alerts the owner.
export async function createNoChargeOrderAction(_prev: NoChargeState, form: FormData): Promise<NoChargeState> {
  const owner = await requirePermission("orders.no_charge");
  const customerId = z.string().uuid().safeParse(form.get("customer"));
  if (!customerId.success) return { errors: { form: CANT_RECEIVE } };
  const key = z.string().uuid().safeParse(form.get("key"));
  if (!key.success) return { errors: { form: STALE_FORM } };
  const who = await recipient(customerId.data);
  if (!who || who.blocked || !who.agreedAt) return { errors: { form: CANT_RECEIVE } };

  const stock = await stockOptions();
  const parsed = parseNoCharge((k) => form.getAll(k).map(String), stock);
  if (!parsed.ok) return { errors: parsed.errors };
  const input = parsed.value;

  let replacesOrderId: string | null = null;
  if (input.replaces) {
    replacesOrderId = await orderIdByNumber(input.replaces, who.id);
    if (!replacesOrderId) return { errors: { replaces: "That order isn't this customer's." } };
  }

  const ship = shipAddressSchema.safeParse({
    name: form.get("ship_name") ?? "", line1: form.get("ship_line1") ?? "", line2: form.get("ship_line2") ?? null,
    city: form.get("ship_city") ?? "", state: form.get("ship_state") ?? "", zip: form.get("ship_zip") ?? "",
  });
  if (!ship.success) return { errors: { form: "Please complete the shipping address." } };

  const lines = buildLines(input.lines, stock);
  const { retailCents } = summary(lines);
  // Every failure after the key was used hands the form a fresh one.
  const failed = (errors: NoChargeErrors & { form?: string }): NoChargeState => ({ errors, key: crypto.randomUUID() });

  let order: { id: string; orderNumber: string } | null = null;
  let firstNumber: string | null = null;
  try {
    const created = await createNoChargeOrder({
      customerId: who.id, email: who.email, ship: ship.data, lines, retailCents,
      reason: input.reason, note: input.note, replacesOrderId, actorId: owner.id, agreedAt: who.agreedAt, key: key.data,
    });
    if ("duplicate" in created) {
      // The same form was submitted twice: open the order the first one made.
      const first = await orderByNoChargeKey(key.data);
      if (!first || first.status === "cancelled") return failed({ form: NOT_RESERVED });
      firstNumber = first.orderNumber;
    } else {
      order = created;
    }
  } catch (err) {
    console.error("no-charge order create failed:", err);
    if (err instanceof NoChargeCreateError && err.order) await cancelUnsent(err.order);
    return failed({ form: NOT_RESERVED });
  }
  // redirect() throws, so it stays outside the try above.
  if (!order) redirect(`/admin/orders/${firstNumber}`);

  let hold: HoldResult;
  try {
    hold = await holdVials(order.id);
  } catch (err) {
    console.error("hold_vials failed:", err);
    await cancelUnsent(order);
    return failed({ form: NOT_RESERVED });
  }
  if (!hold.ok) {
    await cancelUnsent(order);
    if (hold.reason === "sold_out") {
      const names = hold.short.map((s) => {
        const l = lines.find((x) => x.compoundSlug === s.slug && x.variantId === s.variantId);
        return l ? `${l.compoundName} ${l.strength}` : `${s.slug} ${s.variantId}`;
      });
      return failed({ lines: `Not enough ${joinNames(names)} left — someone just bought it. Lower the count.` });
    }
    return failed({ form: NOT_AVAILABLE });
  }
  let paid: boolean;
  try {
    paid = await transitionOrder(order.id, "awaiting_payment", "paid");
  } catch (err) {
    console.error("no-charge paid transition failed:", err);
    paid = false;
  }
  if (!paid) {
    await cancelUnsent(order);
    return failed({ form: NOT_RESERVED });
  }
  catalogStockChanged();
  try {
    await afterOrderPaid(order.id, { notify: input.email });
  } catch (err) {
    await alertOwner("No-charge order follow-up failed", `${order.orderNumber}: ${String(err)}`);
  }
  await recordAdminEvent({
    area: "orders", action: "no_charge_created", targetId: order.id, label: order.orderNumber,
    detail: `${REASON_LABEL[input.reason]} · ${usd(retailCents)} retail · email: ${input.email ? "yes" : "no"}`, actorId: owner.id,
  });
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${order.orderNumber}`);
}

// Cancels a no-charge order that never reached paid (awaiting_payment →
// cancelled; the settle trigger releases any held vials). Never throws: if
// the order can't be cancelled the owner is alerted by order number.
async function cancelUnsent(order: { id: string; orderNumber: string }): Promise<void> {
  try {
    if (!(await transitionOrder(order.id, "awaiting_payment", "cancelled"))) {
      await alertOwner("No-charge order not cancelled", `${order.orderNumber}: it was no longer awaiting payment — check it in Orders.`);
    }
  } catch (err) {
    await alertOwner("No-charge order not cancelled", `${order.orderNumber}: ${String(err)}`);
  }
}

// Cancel = paid → refunded; the settle trigger returns the sold vials to
// stock. No money moved, so no refund steps and no email.
export async function cancelNoChargeOrderAction(form: FormData): Promise<void> {
  const owner = await requirePermission("orders.no_charge");
  const STALE = "This order can't be cancelled any more — reload the page.";
  const orderId = z.string().uuid().safeParse(form.get("orderId"));
  if (!orderId.success) throw new Error(STALE);
  const order = await getOrderById(orderId.data);
  if (!order || order.kind !== "no_charge") throw new Error(STALE);
  if (order.status === "shipped") throw new Error("This order has shipped — it can't be cancelled.");
  if (order.status !== "paid") throw new Error(STALE);
  if (!(await transitionOrder(order.id, "paid", "refunded"))) throw new Error(STALE);
  catalogStockChanged();
  await recordAdminEvent({ area: "orders", action: "no_charge_cancelled", targetId: order.id, label: order.order_number, detail: null, actorId: owner.id });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.order_number}`);
}
