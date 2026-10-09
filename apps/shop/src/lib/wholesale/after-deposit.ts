import "server-only";
import { getOrderById } from "@/lib/orders";
import { ownerNewWholesaleOrderEmail, wholesaleDepositEmail } from "@/lib/emails";
import { alertAddress, alertOwner, sendOrAlert } from "@/lib/notify";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { estimatedDates } from "@/lib/wholesale/rules";
import { ensureRun } from "@/lib/wholesale/runs-data";

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
  // A run cutoff should always be set by the time a deposit is paid; if it
  // somehow isn't, the emails still go out (with generic refund copy) and the
  // owner is alerted to set the run by hand rather than this throwing after
  // the order is already deposit_paid (Stripe would never retry the emails).
  let dates: { testedAbout: string; shipsAbout: string } | null = null;
  if (order.wholesale_cutoff_on) {
    dates = estimatedDates(order.wholesale_cutoff_on, leadDays);
    try {
      await ensureRun(order.wholesale_cutoff_on);
    } catch (err) {
      await alertOwner("Wholesale run not created", `${order.order_number}: run for ${order.wholesale_cutoff_on} — ${String(err)}. The cron creates it on its next pass.`);
    }
  } else {
    await alertOwner("Wholesale order missing cutoff date", `${order.order_number}: deposit paid but the order has no run cutoff; the deposit email went without dates. Set the run by hand.`);
  }
  const emailed = await sendOrAlert({ to: order.email, ...wholesaleDepositEmail(order, dates) }, `wholesale deposit ${order.order_number}`);
  const owner = alertAddress();
  if (owner) await sendOrAlert({ to: owner, ...ownerNewWholesaleOrderEmail(order) }, `owner wholesale ${order.order_number}`);
  return { emailed };
}
