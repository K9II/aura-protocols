import "server-only";
import { getOrderById, transitionOrder } from "@/lib/orders";
import { alertOwner, sendOrAlert } from "@/lib/notify";
import { wholesaleBalanceReminderEmail, wholesaleForfeitEmail } from "@/lib/emails";
import { usd } from "@/lib/html";
import { siteUrl } from "@/lib/supabase/env";
import { addDays, dateLabel, localDate } from "@/lib/today/time";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { balanceTiming, daysSince, kitsByStrength, PAST_CUTOFF_ALERT_DAYS, strengthKey } from "@/lib/wholesale/runs";
import { balanceDueOrders, cutoffsWithoutRuns, ensureRun, listRuns, logOnce, runByCutoff, runLines, runOrders } from "@/lib/wholesale/runs-data";

export type WholesaleCronResult = { runsCreated: number; reminders: number; overdue: number; forfeited: number; failed: string[] };

// Daily (from the reconcile cron). Idempotent: every email and alert is
// recorded once in production_run_events (event_key). One failing order or
// run is reported in `failed` and never stops the others.
export async function runWholesaleCron(nowMs: number): Promise<WholesaleCronResult> {
  const out: WholesaleCronResult = { runsCreated: 0, reminders: 0, overdue: 0, forfeited: 0, failed: [] };
  const today = localDate(nowMs);
  const s = await getWholesaleSettings();
  const step = async (what: string, fn: () => Promise<void>) => { try { await fn(); } catch (err) { out.failed.push(`${what}: ${err instanceof Error ? err.message : String(err)}`); } };

  // 1. Runs backfill first, so every balance order below finds its run.
  await step("runs backfill", async () => {
    for (const c of await cutoffsWithoutRuns()) { await ensureRun(c); out.runsCreated++; }
  });

  // 2. Balances: reminder (day 5), overdue alert (day N), forfeit (day N+1).
  let due: Awaited<ReturnType<typeof balanceDueOrders>> = [];
  await step("balances read", async () => { due = await balanceDueOrders(); });
  for (const o of due) {
    if (!o.balance_due_at) continue;
    await step(`balance ${o.order_number}`, async () => {
      const t = balanceTiming(o.balance_due_at!, s.balanceDays);
      const run = await runByCutoff(o.wholesale_cutoff_on);
      if (!run) throw new Error(`no run for ${o.wholesale_cutoff_on}`);
      const dueOn = addDays(localDate(Date.parse(o.balance_due_at!)), s.balanceDays);
      if (nowMs >= t.forfeitAt) {
        // Cancelled (deposit kept) — the settle trigger releases its held vials to retail.
        if (!(await transitionOrder(o.id, "balance_due", "cancelled"))) return;
        out.forfeited++;
        if (await logOnce({ runId: run.id, kind: "forfeited", key: `forfeit:${o.id}`, orderId: o.id })) {
          await alertOwner("Wholesale order forfeited", `${o.order_number}: balance ${usd(o.balance_cents)} due ${dateLabel(dueOn)} not paid — cancelled, deposit ${usd(o.deposit_cents)} kept, its vials are back in retail stock.`);
          const full = await getOrderById(o.id);
          if (full) await sendOrAlert({ to: full.email, ...wholesaleForfeitEmail(full) }, `wholesale forfeit ${o.order_number}`);
        }
      } else if (nowMs >= t.overdueAt) {
        if (await logOnce({ runId: run.id, kind: "overdue_alerted", key: `overdue:${o.id}`, orderId: o.id })) {
          out.overdue++;
          await alertOwner("Wholesale balance overdue", `${o.order_number}: balance ${usd(o.balance_cents)} due ${dateLabel(dueOn)} not paid — the order cancels tomorrow unless it's paid.`);
        }
      } else if (nowMs >= t.remindAt) {
        if (await logOnce({ runId: run.id, kind: "reminder_sent", key: `reminder:${o.id}`, orderId: o.id })) {
          const full = await getOrderById(o.id);
          if (full && await sendOrAlert({ to: full.email, ...wholesaleBalanceReminderEmail(full, { dueOn, siteUrl: siteUrl() }) }, `wholesale reminder ${o.order_number}`)) out.reminders++;
        }
      }
    });
  }

  // 3. A closed run with a strength still not ordered after PAST_CUTOFF_ALERT_DAYS.
  let runs: Awaited<ReturnType<typeof listRuns>> = [];
  await step("runs read", async () => { runs = await listRuns(); });
  for (const r of runs) {
    if (daysSince(r.cutoff_on, today) < PAST_CUTOFF_ALERT_DAYS) continue;
    await step(`run ${r.number}`, async () => {
      const [lines, orders] = await Promise.all([runLines(r.id), runOrders([r.cutoff_on])]);
      const open = orders.filter((o) => o.status === "deposit_paid");
      const missing = [...kitsByStrength(open).keys()].filter((k) => !lines.some((l) => strengthKey(l.slug, l.variant_id) === k && l.ordered_at));
      if (missing.length && await logOnce({ runId: r.id, kind: "past_cutoff_alerted", key: `past_cutoff:${r.id}` })) {
        await alertOwner("Wholesale run not ordered", `${r.number} (cutoff ${dateLabel(r.cutoff_on)}): ${missing.join(", ")} not ordered yet.`);
      }
    });
  }
  return out;
}
