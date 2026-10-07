import "server-only";
import { getOrderById, saveTaxTransactionId } from "@/lib/orders";
import { getPartnerById } from "@/lib/partners/data";
import { createCommission, markCommissionClearing, spendCredit } from "@/lib/partners/ledger";
import { getCommerceAdapter } from "@/lib/commerce";
import { noChargeEmail, orderConfirmationEmail, ownerNewOrderEmail } from "@/lib/emails";
import { alertAddress, alertOwner, sendOrAlert } from "@/lib/notify";
import { logOversold, orderHoldShortfall } from "@/lib/catalog-ops/data";
import type { OrderRow } from "@/lib/orders";

// Runs once, right after an order moves to paid (webhook, reconciler, or a
// fully store-credit order). Each step below is independent and wrapped in
// its own try/catch with a named owner alert — one step failing must never
// stop the others, and the confirmation + owner emails always go out.
// A no-charge order has no money steps (no commission, credit or tax) and no
// receipt or owner new-order email; it only checks held vials and, when the
// owner ticked the box, sends the "on its way soon" email.
export async function afterOrderPaid(orderId: string, opts: { notify?: boolean } = {}): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error(`order ${orderId} not found after payment`);

  if (order.kind === "no_charge") {
    await checkHeldVials(order);
    if (opts.notify) await sendOrAlert({ to: order.email, ...noChargeEmail(order) }, `no-charge order ${order.order_number}`);
    return;
  }

  if (order.partner_id && order.attributed_by) {
    try {
      const partner = await getPartnerById(order.partner_id);
      if (partner?.status === "approved") {
        // Re-read right before creating the commission: a refund, chargeback
        // or shipment racing this call must be reflected. "shipped" is still
        // eligible — the ship action can land before this call does — in
        // which case the freshly-created commission is moved straight into
        // clearing (mark-shipped already ran and found nothing to clear).
        const current = await getOrderById(orderId);
        if (current?.status === "paid" || current?.status === "shipped") {
          await createCommission({
            partnerId: partner.id, orderId: order.id, attributedBy: order.attributed_by,
            baseCents: order.subtotal_cents - order.partner_discount_cents, ratePct: partner.tier_pct,
          });
          if (current.status === "shipped") {
            await markCommissionClearing(order.id, current.shipped_at ?? new Date().toISOString());
          }
        }
      }
    } catch (err) {
      await alertOwner("Commission not recorded", `${order.order_number}: ${String(err)}`);
    }
  }

  if (order.store_credit_cents > 0) {
    try {
      if (!(await spendCredit(order.customer_id, order.store_credit_cents, order.id))) {
        await alertOwner("Store credit not taken", `${order.order_number}: ${order.store_credit_cents} cents of store credit could not be taken from ${order.customer_id}.`);
      }
    } catch (err) {
      await alertOwner("Store credit not taken", `${order.order_number}: ${String(err)}`);
    }
  }

  if (order.tax_calculation_id && !order.tax_transaction_id) {
    try {
      const transactionId = await getCommerceAdapter().recordTax(order.tax_calculation_id, order.order_number);
      if (transactionId) {
        await saveTaxTransactionId(order.id, transactionId);
      } else {
        // Stripe reports the reference was already used (a retried call),
        // but without the transaction id a later refund can't reverse it.
        await alertOwner("Sales tax not recorded", `${order.order_number}: tax recorded earlier; transaction id unknown — reversal will be manual`);
      }
    } catch (err) {
      await alertOwner("Sales tax not recorded", `${order.order_number}: ${String(err)}`);
    }
  }

  await checkHeldVials(order);

  await sendOrAlert({ to: order.email, ...orderConfirmationEmail(order) }, `order ${order.order_number}`);
  const owner = alertAddress();
  if (owner) await sendOrAlert({ to: owner, ...ownerNewOrderEmail(order) }, `owner alert ${order.order_number}`);
}

// Paid but not fully held (it was paid after its holds were released): the
// order still ships but stock is short. Tell the owner. Never throws.
async function checkHeldVials(order: OrderRow): Promise<void> {
  try {
    const short = await orderHoldShortfall(order.id);
    if (short.length) {
      // The owner hears about the shortfall first; logging it in the catalog
      // history comes after, so a failed log never hides the list.
      await alertOwner("Oversold: paid without enough held vials",
        `Order ${order.order_number} was paid without enough held vials:\n${short.map((s) => `${s.compound_slug} ${s.variant_id}: ${s.need} ordered, ${s.covered} held`).join("\n")}\nCheck stock in Catalog & lots and correct counts once you know what you can ship.`);
    }
    for (const s of short) {
      try {
        await logOversold(s.compound_slug, s.variant_id, order.order_number, s.need, s.covered);
      } catch (err) {
        console.error("oversold event log failed:", err);
        await alertOwner("Oversold event not logged", `${order.order_number} · ${s.compound_slug} ${s.variant_id}: ${String(err)}`);
      }
    }
  } catch (err) {
    await alertOwner("Stock check failed after payment", `${order.order_number}: ${String(err)}`);
  }
}
