import "server-only";
import { getOrderById } from "@/lib/orders";
import { ownerNewWholesaleOrderEmail, wholesaleDepositEmail } from "@/lib/emails";
import { alertAddress, alertOwner, sendOrAlert } from "@/lib/notify";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { estimatedDates } from "@/lib/wholesale/rules";
import { depositCutoff } from "@/lib/wholesale/quote";
import { currentMs } from "@/lib/clock";
import { localDate } from "@/lib/today/time";
import type { OrderRow } from "@/lib/orders";
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
  let runId: string | null = null;
  if (order.wholesale_cutoff_on) {
    dates = estimatedDates(order.wholesale_cutoff_on, leadDays);
    try {
      runId = await ensureRun(order.wholesale_cutoff_on);
    } catch (err) {
      await alertOwner("Wholesale run not created", `${order.order_number}: run for ${order.wholesale_cutoff_on} — ${String(err)}. The cron creates it on its next pass.`);
    }
  } else {
    await alertOwner("Wholesale order missing cutoff date", `${order.order_number}: deposit paid but the order has no run cutoff; the deposit email went without dates. Set the run by hand.`);
  }
  const emailed = await sendOrAlert({ to: order.email, ...wholesaleDepositEmail(order, dates) }, `wholesale deposit ${order.order_number}`);
  const owner = alertAddress();
  if (owner) await sendOrAlert({ to: owner, ...ownerNewWholesaleOrderEmail(order, { runId }) }, `owner wholesale ${order.order_number}`);
  return { emailed };
}

// The card deposit / a recorded deposit: a deposit that lands after the order's
// run closed joins the run open that day (the deposit email carries its dates).
export async function depositRunPatch(order: Pick<OrderRow, "order_number" | "wholesale_cutoff_on">): Promise<{ wholesale_cutoff_on?: string }> {
  if (!order.wholesale_cutoff_on) return {};
  try {
    const s = await getWholesaleSettings();
    const next = depositCutoff(order.wholesale_cutoff_on, localDate(currentMs()), { runDays: s.runDays, override: s.nextCutoffOverride });
    return next === order.wholesale_cutoff_on ? {} : { wholesale_cutoff_on: next };
  } catch (err) {
    await alertOwner("Quote order run not moved", `${order.order_number}: the deposit landed but the run couldn't be checked (${String(err)}). It stays in the run for ${order.wholesale_cutoff_on}; move it by hand if that run already closed.`);
    return {};
  }
}
