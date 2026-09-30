import "server-only";
import { getOrderById, saveTaxTransactionId } from "@/lib/orders";
import { getPartnerById } from "@/lib/partners/data";
import { createCommission, spendCredit } from "@/lib/partners/ledger";
import { getCommerceAdapter } from "@/lib/commerce";
import { orderConfirmationEmail, ownerNewOrderEmail } from "@/lib/emails";
import { alertAddress, alertOwner, sendOrAlert } from "@/lib/notify";

// Runs once, right after an order moves to paid (webhook, reconciler, or a
// fully store-credit order). Each step is independent: a failure alerts the
// owner and never undoes the payment.
export async function afterOrderPaid(orderId: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error(`order ${orderId} not found after payment`);

  if (order.partner_id && order.attributed_by) {
    const partner = await getPartnerById(order.partner_id);
    if (partner?.status === "approved") {
      // Re-read right before creating the commission: a refund or chargeback
      // webhook racing this call must never leave a commission behind for an
      // order that is no longer paid.
      const current = await getOrderById(orderId);
      if (current?.status === "paid") {
        await createCommission({
          partnerId: partner.id, orderId: order.id, attributedBy: order.attributed_by,
          baseCents: order.subtotal_cents - order.partner_discount_cents, ratePct: partner.tier_pct,
        });
      }
    }
  }

  if (order.store_credit_cents > 0 && !(await spendCredit(order.customer_id, order.store_credit_cents, order.id))) {
    await alertOwner("Store credit short on a paid order", `${order.order_number}: ${order.store_credit_cents} cents of store credit could not be taken from ${order.customer_id}.`);
  }

  if (order.tax_calculation_id) {
    try {
      const transactionId = await getCommerceAdapter().recordTax(order.tax_calculation_id, order.order_number);
      if (transactionId) await saveTaxTransactionId(order.id, transactionId);
    } catch (err) {
      await alertOwner("Tax transaction not recorded", `${order.order_number} (${order.tax_calculation_id}): ${String(err)}`);
    }
  }

  await sendOrAlert({ to: order.email, ...orderConfirmationEmail(order) }, `order ${order.order_number}`);
  const owner = alertAddress();
  if (owner) await sendOrAlert({ to: owner, ...ownerNewOrderEmail(order) }, `owner alert ${order.order_number}`);
}
