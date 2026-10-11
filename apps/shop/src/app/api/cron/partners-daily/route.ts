import { NextResponse } from "next/server";
import {
  clearDueCommissions, listQueuedPayouts, listUnfinishedPayoutRuns, runPayouts, sweepShippedCommissions,
} from "@/lib/partners/ledger";
import { getPartnerById, partnerEmail } from "@/lib/partners/data";
import { isCashDay } from "@/lib/partners/payout-math";
import { ownerPayoutRunEmail, partnerCreditAddedEmail } from "@/lib/emails-partners";
import { alertAddress, alertOwner, sendOrAlert } from "@/lib/notify";

type RunLike = { results: { partnerId: string; creditValueCents: number }[] };

// Emails partners credited this run (at most one email a day each), then, on a
// cash day only, the owner the list of cash to send by hand. Returns how many
// cash payouts were queued.
async function emailPayoutResults(runDate: string, run: RunLike): Promise<number> {
  for (const r of run.results.filter((x) => x.creditValueCents > 0)) {
    const partner = await getPartnerById(r.partnerId);
    const to = partner ? await partnerEmail(partner.customer_id) : null;
    if (to) await sendOrAlert({ to, ...partnerCreditAddedEmail({ creditValueCents: r.creditValueCents }) }, `credit ${partner?.code}`);
  }
  if (!isCashDay(runDate)) return 0;
  const queued = (await listQueuedPayouts()).filter((p) => p.run_date === runDate);
  const owner = alertAddress();
  if (owner) {
    await sendOrAlert({ to: owner, ...ownerPayoutRunEmail(runDate, queued.map((p) => ({
      code: p.partners?.code ?? "?", cashCents: p.cash_cents, hint: p.partners?.payout_details_hint ?? null,
    }))) }, `payout run ${runDate}`);
  }
  return queued.length;
}

// Daily (Vercel Cron, `Authorization: Bearer $CRON_SECRET`). Four
// self-healing jobs, each isolated in its own try/catch so one failing
// never skips the others:
//   1. clear commission past its 15-day hold
//   2. resume any earlier payout run that started but never finished (a
//      crash mid-run, or one left with per-partner failures)
//   3. sweep commissions still 'pending' whose order has since shipped onto
//      the clearing timer, keyed off the order's own shipped_at
//   4. every day, run today's payout: store credit for commission that has
//      cleared is issued at once; on the 1st and 15th (UTC) cash is also
//      queued and the owner gets the list by email
// Every failure alerts the owner.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const runDate = now.toISOString().slice(0, 10);

  let cleared = 0;
  try {
    cleared = await clearDueCommissions(now.toISOString());
  } catch (err) {
    console.error("clear due commissions failed:", err);
    await alertOwner("Clear due commissions failed", String(err));
  }

  const resumed: Array<{ runDate: string; partners: number; failures: number; cashQueued: number } | { runDate: string; error: string }> = [];
  try {
    for (const stuckDate of await listUnfinishedPayoutRuns(runDate)) {
      try {
        const run = await runPayouts(stuckDate);
        const failures = run.failures ?? [];
        const cashQueued = await emailPayoutResults(stuckDate, run);
        resumed.push({ runDate: stuckDate, partners: run.results.length, failures: failures.length, cashQueued });
        if (failures.length) await alertOwner("Payout run still has failures", `Run ${stuckDate}: ${JSON.stringify(failures)}`);
      } catch (err) {
        resumed.push({ runDate: stuckDate, error: err instanceof Error ? err.message : String(err) });
        await alertOwner("Resuming a payout run failed", `Run ${stuckDate}: ${String(err)}`);
      }
    }
  } catch (err) {
    console.error("list unfinished payout runs failed:", err);
    await alertOwner("List unfinished payout runs failed", String(err));
  }

  let swept = { commissions: 0, errors: 0 };
  try {
    const sweep = await sweepShippedCommissions();
    swept = { commissions: sweep.swept, errors: sweep.errors.length };
    if (sweep.errors.length) await alertOwner("Sweep shipped commissions had failures", sweep.errors.join("\n"));
  } catch (err) {
    console.error("sweep shipped commissions failed:", err);
    await alertOwner("Sweep shipped commissions failed", String(err));
  }

  try {
    const run = await runPayouts(runDate);
    if (run.skipped) return NextResponse.json({ cleared, resumed, swept, payoutRun: { runDate, skipped: true } });
    const cashQueued = await emailPayoutResults(runDate, run);
    const todayFailures = run.failures ?? [];
    if (todayFailures.length) await alertOwner("Payout run had partner failures", `Run ${runDate}: ${JSON.stringify(todayFailures)}`);
    return NextResponse.json({ cleared, resumed, swept, payoutRun: { runDate, partners: run.results.length, cashQueued } });
  } catch (err) {
    console.error("payout run failed:", err);
    await alertOwner("Payout run failed", `Run ${runDate}: ${String(err)}`);
    return NextResponse.json({ error: "payout run failed" }, { status: 500 });
  }
}
