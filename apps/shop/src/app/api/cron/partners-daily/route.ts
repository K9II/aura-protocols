import { NextResponse } from "next/server";
import {
  clearDueCommissions, listQueuedPayouts, listUnfinishedPayoutRuns, runPayouts, sweepShippedCommissions,
} from "@/lib/partners/ledger";
import { getPartnerById, partnerEmail } from "@/lib/partners/data";
import { ownerPayoutRunEmail, partnerCreditAddedEmail } from "@/lib/emails-partners";
import { alertAddress, alertOwner, sendOrAlert } from "@/lib/notify";

type RunLike = { results: { partnerId: string; creditValueCents: number }[] };

// Emails partners credited this run, then the owner the list of cash still
// to send by hand. Returns how many cash payouts were queued.
async function emailPayoutResults(runDate: string, run: RunLike): Promise<number> {
  for (const r of run.results.filter((x) => x.creditValueCents > 0)) {
    const partner = await getPartnerById(r.partnerId);
    const to = partner ? await partnerEmail(partner.customer_id) : null;
    if (to) await sendOrAlert({ to, ...partnerCreditAddedEmail({ creditValueCents: r.creditValueCents }) }, `credit ${partner?.code}`);
  }
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
//      crash mid-run, or one left with per-partner failures) — every day,
//      not just the 1st/15th
//   3. sweep commissions still 'pending' whose order has since shipped onto
//      the clearing timer, keyed off the order's own shipped_at
//   4. on the 1st and 15th (UTC), run today's payout: store credit is
//      issued at once, cash is queued for the owner
// Every failure alerts the owner.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const runDate = now.toISOString().slice(0, 10);
  const day = now.getUTCDate();

  let cleared = 0;
  try {
    cleared = await clearDueCommissions(now.toISOString());
  } catch (err) {
    console.error("clear due commissions failed:", err);
    await alertOwner("Clear due commissions failed", String(err));
  }

  const resumed: Array<{ runDate: string; partners: number; failures: number } | { runDate: string; error: string }> = [];
  try {
    for (const stuckDate of await listUnfinishedPayoutRuns(runDate)) {
      try {
        const run = await runPayouts(stuckDate);
        const failures = run.failures ?? [];
        resumed.push({ runDate: stuckDate, partners: run.results.length, failures: failures.length });
        if (failures.length) await alertOwner(`Payout run ${stuckDate} still has failures`, JSON.stringify(failures));
      } catch (err) {
        resumed.push({ runDate: stuckDate, error: err instanceof Error ? err.message : String(err) });
        await alertOwner(`Resuming payout run ${stuckDate} failed`, String(err));
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

  if (day !== 1 && day !== 15) return NextResponse.json({ cleared, resumed, swept, payoutRun: null });

  try {
    const run = await runPayouts(runDate);
    if (run.skipped) return NextResponse.json({ cleared, resumed, swept, payoutRun: { runDate, skipped: true } });
    const cashQueued = await emailPayoutResults(runDate, run);
    const todayFailures = run.failures ?? [];
    if (todayFailures.length) await alertOwner(`Payout run ${runDate} had partner failures`, JSON.stringify(todayFailures));
    return NextResponse.json({ cleared, resumed, swept, payoutRun: { runDate, partners: run.results.length, cashQueued } });
  } catch (err) {
    console.error("payout run failed:", err);
    await alertOwner(`Payout run failed ${runDate}`, String(err));
    return NextResponse.json({ error: "payout run failed" }, { status: 500 });
  }
}
