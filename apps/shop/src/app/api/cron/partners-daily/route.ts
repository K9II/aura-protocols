import { NextResponse } from "next/server";
import { clearDueCommissions, listQueuedPayouts, runPayouts } from "@/lib/partners/ledger";
import { getPartnerById, partnerEmail } from "@/lib/partners/data";
import { ownerPayoutRunEmail, partnerCreditAddedEmail } from "@/lib/emails-partners";
import { alertAddress, alertOwner, sendOrAlert } from "@/lib/notify";

// Daily (Vercel Cron, `Authorization: Bearer $CRON_SECRET`): commission past
// its 15-day hold becomes payable. On the 1st and 15th (UTC) the payout run
// follows: store credit is issued at once, cash is queued for the owner.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const cleared = await clearDueCommissions(now.toISOString());
  const day = now.getUTCDate();
  if (day !== 1 && day !== 15) return NextResponse.json({ cleared, payoutRun: null });

  const runDate = now.toISOString().slice(0, 10);
  try {
    const run = await runPayouts(runDate);
    if (run.skipped) return NextResponse.json({ cleared, payoutRun: { runDate, skipped: true } });
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
    return NextResponse.json({ cleared, payoutRun: { runDate, partners: run.results.length, cashQueued: queued.length } });
  } catch (err) {
    console.error("payout run failed:", err);
    await alertOwner(`Payout run failed ${runDate}`, String(err));
    return NextResponse.json({ error: "payout run failed" }, { status: 500 });
  }
}
