import "server-only";
import { getOrderById, transitionOrder } from "@/lib/orders";
import { alertOwner, sendOrAlert } from "@/lib/notify";
import { wholesaleBalanceDueEmail, wholesaleLotFailedEmail } from "@/lib/emails";
import { siteUrl } from "@/lib/supabase/env";
import { currentMs } from "@/lib/clock";
import { localDate, addDays } from "@/lib/today/time";
import { compoundTitle } from "@/lib/catalog";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { estimatedDates } from "@/lib/wholesale/rules";
import { orderReady } from "@/lib/wholesale/runs";
import { logOnce, runLines, runOrders, type RunRow } from "@/lib/wholesale/runs-data";

// After a strength passes: each order of the run whose every strength has
// passed moves to balance_due (7-day clock starts) and gets the balance email.
export async function releaseReadyOrders(run: Pick<RunRow, "id" | "cutoff_on">): Promise<string[]> {
  const [lines, orders] = await Promise.all([runLines(run.id), runOrders([run.cutoff_on])]);
  const { balanceDays } = await getWholesaleSettings();
  const moved: string[] = [];
  for (const o of orders) {
    if (o.status !== "deposit_paid" || !orderReady(o, lines)) continue;
    const at = new Date(currentMs()).toISOString();
    if (!(await transitionOrder(o.id, "deposit_paid", "balance_due", { balance_due_at: at }))) continue;
    moved.push(o.order_number);
    try {
      if (await logOnce({ runId: run.id, kind: "balance_due", key: `balance_due:${o.id}`, orderId: o.id })) {
        const full = await getOrderById(o.id);
        if (full) await sendOrAlert({ to: full.email, ...wholesaleBalanceDueEmail(full, { dueOn: addDays(localDate(Date.parse(at)), balanceDays), siteUrl: siteUrl() }) }, `wholesale balance due ${o.order_number}`);
      }
    } catch (err) {
      await alertOwner("Wholesale balance email not sent", `${o.order_number}: ${String(err)}`);
    }
  }
  return moved;
}

// After a strength fails: every open order containing it hears once, with the
// new estimated ship date (re-source time = one more lead time from today).
export async function afterLineFailed(run: Pick<RunRow, "id" | "cutoff_on">, line: { id: string; slug: string; variant_id: string; strength: string; name: string }): Promise<number> {
  const [orders, s] = await Promise.all([runOrders([run.cutoff_on]), getWholesaleSettings()]);
  const newShips = estimatedDates(localDate(currentMs()), s.leadDays).shipsAbout;
  let n = 0;
  for (const o of orders) {
    if (o.status !== "deposit_paid" || !o.items.some((i) => i.compound_slug === line.slug && i.variant_id === line.variant_id)) continue;
    try {
      if (!(await logOnce({ runId: run.id, kind: "lot_failed_emailed", key: `failed:${line.id}:${o.id}`, orderId: o.id, lineId: line.id }))) continue;
      const full = await getOrderById(o.id);
      if (full && await sendOrAlert({ to: full.email, ...wholesaleLotFailedEmail(full, { strengths: [`${compoundTitle({ slug: line.slug, name: line.name })} ${line.strength}`], newShipsAbout: newShips, siteUrl: siteUrl() }) }, `wholesale lot failed ${o.order_number}`)) n++;
    } catch (err) {
      await alertOwner("Wholesale lot-failed email not sent", `${o.order_number}: ${String(err)}`);
    }
  }
  return n;
}
