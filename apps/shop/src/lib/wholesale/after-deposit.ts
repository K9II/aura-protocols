import "server-only";
import { getOrderById } from "@/lib/orders";
import { ownerNewWholesaleOrderEmail, wholesaleDepositEmail } from "@/lib/emails";
import { alertAddress, alertOwner, sendOrAlert } from "@/lib/notify";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { estimatedDates } from "@/lib/wholesale/rules";

// Runs once a wholesale deposit is paid. No commission (wholesale pays none),
// no stock (made to order), no tax record (recorded when the balance is paid).
export async function afterDepositPaid(orderId: string): Promise<{ emailed: boolean }> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error(`order ${orderId} not found after deposit`);
  let leadDays = 28;
  try {
    leadDays = (await getWholesaleSettings()).leadDays;
  } catch (err) {
    await alertOwner("Wholesale settings unreadable", `${order.order_number}: deposit email used the 28-day default. ${String(err)}`);
  }
  const dates = estimatedDates(order.wholesale_cutoff_on ?? "", leadDays);
  const emailed = await sendOrAlert({ to: order.email, ...wholesaleDepositEmail(order, dates) }, `wholesale deposit ${order.order_number}`);
  const owner = alertAddress();
  if (owner) await sendOrAlert({ to: owner, ...ownerNewWholesaleOrderEmail(order) }, `owner wholesale ${order.order_number}`);
  return { emailed };
}
