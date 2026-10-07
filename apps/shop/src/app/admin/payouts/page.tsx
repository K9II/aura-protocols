import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { getPayoutDetails, listPartners, listW9sAwaitingCheck } from "@/lib/partners/data";
import { PAYOUT_PAGE_SIZE, countPayoutHistory, formatRunDate, latestRunSummary, listPayoutHistory, listQueuedPayouts, payoutRunWarning } from "@/lib/partners/ledger";
import { CASH_MIN_CENTS, CREDIT_MULTIPLIER } from "@/lib/partners/tiers";
import { shortDate } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { markPayoutPaidAction, markW9CheckedAction, openW9Action } from "@/app/admin/payouts/actions";
import { Crumbs, Icon, Kpis, Tabs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Payouts", robots: { index: false, follow: false } };

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  await requirePermission("payouts.view");
  const sp = await searchParams;
  const tab = sp.tab === "history" ? "history" : "send";
  const pageRaw = Number(sp.page);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.trunc(pageRaw) : 1;
  const [queued, run, approved, w9s, history, historyCountOnSend] = await Promise.all([
    listQueuedPayouts(), latestRunSummary(), listPartners("approved"), listW9sAwaitingCheck(),
    tab === "history" ? listPayoutHistory(page) : Promise.resolve(null),
    tab === "send" ? countPayoutHistory() : Promise.resolve(null),
  ]);
  const details = tab === "send" ? await Promise.all(queued.map((p) => getPayoutDetails(p.partner_id))) : [];
  const cashTotal = queued.reduce((s, p) => s + p.cash_cents, 0);
  const carried = approved.filter((p) => p.cash_carry_cents > 0);
  const warning = payoutRunWarning(run);
  const historyTotal = tab === "history" ? history!.total : historyCountOnSend!;
  const lastPage = history ? Math.max(1, Math.ceil(history.total / PAYOUT_PAGE_SIZE)) : 1;
  const histHref = (n: number) => `/admin/payouts?tab=history${n > 1 ? `&page=${n}` : ""}`;

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Payouts" }]} />
      <div className="a-ph"><div><h1>Payouts</h1><p>{run ? `Latest run ${formatRunDate(run.runDate)}. ` : "No payout run yet. "}Send cash from your bank or Zelle, then mark it paid with the reference — the partner gets a receipt. Store credit is added automatically.</p></div></div>
      {warning && <div className="a-banner" role="alert"><Icon name="warn" /><span><b>Payout run needs attention.</b> {warning}</span></div>}

      <Kpis items={[
        { label: "Cash to send", value: usd(cashTotal), sub: `${queued.length} partner${queued.length === 1 ? "" : "s"} · ACH or Zelle` },
        { label: "Store credit issued", value: usd(run?.creditCents ?? 0), sub: `${run?.creditPartners ?? 0} partner${run?.creditPartners === 1 ? "" : "s"} · latest run · ${CREDIT_MULTIPLIER}× value` },
        { label: "Carried to next run", value: `${carried.length} partner${carried.length === 1 ? "" : "s"}`, sub: `under ${usd(CASH_MIN_CENTS)} or awaiting a W-9 check` },
      ]} />

      <div className="a-toolbar"><Tabs items={[
        { href: "/admin/payouts", label: "To send", n: queued.length, on: tab === "send" },
        { href: "/admin/payouts?tab=history", label: "History", n: historyTotal, on: tab === "history" },
      ]} /></div>

      {tab === "send" ? (queued.length === 0 ? <div className="a-empty">No cash payouts waiting.</div> : <>
        <table className="a-t a-only-desk">
          <thead><tr><th>Partner</th><th>Send to</th><th className="num">Amount</th><th /></tr></thead>
          <tbody>{queued.map((p, i) => {
            const d = details[i];
            const current = p.partners?.payout_details_hint ?? null;
            const changed = !!p.details_hint && p.details_hint !== current;
            return (
              <tr key={p.id}>
                <td><Link className="a-ord" href={`/admin/partners/${p.partner_id}`}>{p.partners?.code}</Link><span className="sub">Run {formatRunDate(p.run_date)}</span></td>
                <td>{current ?? "No payout method on file"}
                  {changed && <div className="a-err" role="alert">Changed since this payout was queued (was {p.details_hint}). Confirm with the partner first.</div>}
                  {d && <details style={{ fontSize: 12 }}><summary className="a-ulink">Show full details</summary>
                    <p style={{ marginTop: 4 }}>{d.kind === "ach" ? `Routing ${d.routing} · Account ${d.account} · ${d.bank}` : `Zelle ${d.handle}`}</p></details>}</td>
                <td className="num" style={{ font: "400 17px var(--serif)" }}>{usd(p.cash_cents)}</td>
                <td><form action={markPayoutPaidAction} className="a-acts">
                  <input type="hidden" name="payoutId" value={p.id} />
                  <div className="a-input" style={{ width: 170, height: 28 }}><input name="reference" required minLength={2} maxLength={80} placeholder="Reference" aria-label={`Payment reference for ${p.partners?.code}`} /></div>
                  <button type="submit" className="a-btn sm primary">Mark paid</button>
                </form></td>
              </tr>
            );
          })}</tbody>
        </table>
        <div className="a-plist a-only-phone">{queued.map((p, i) => {
          const d = details[i];
          const current = p.partners?.payout_details_hint ?? null;
          const changed = !!p.details_hint && p.details_hint !== current;
          return (
            <div key={p.id} className="a-pord">
              <span><Link className="a-ord" href={`/admin/partners/${p.partner_id}`}>{p.partners?.code}</Link><span className="sub">Run {formatRunDate(p.run_date)}</span></span>
              <span className="tot">{usd(p.cash_cents)}</span>
              <span className="nm">{current ?? "No payout method on file"}</span>
              {changed && <div className="a-err" role="alert">Changed since this payout was queued (was {p.details_hint}). Confirm with the partner first.</div>}
              {d && <details style={{ fontSize: 12 }}><summary className="a-ulink">Show full details</summary>
                <p style={{ marginTop: 4 }}>{d.kind === "ach" ? `Routing ${d.routing} · Account ${d.account} · ${d.bank}` : `Zelle ${d.handle}`}</p></details>}
              <form action={markPayoutPaidAction} className="row2">
                <input type="hidden" name="payoutId" value={p.id} />
                <div className="a-input" style={{ flex: 1, height: 28 }}><input name="reference" required minLength={2} maxLength={80} placeholder="Reference" aria-label={`Payment reference for ${p.partners?.code}`} /></div>
                <button type="submit" className="a-btn sm primary">Mark paid</button>
              </form>
            </div>
          );
        })}</div>
        <div className="a-tfoot">Nothing is sent automatically</div>
      </>) : (!history || history.rows.length === 0 ? (
        <div className="a-empty">{history && history.total > 0
          ? <>No rows on this page. <Link className="a-ulink" href={histHref(1)}>Back to page 1</Link></>
          : "No payouts yet."}</div>
      ) : <>
        <table className="a-t a-only-desk">
          <thead><tr><th>Paid</th><th>Partner</th><th className="num">Cash</th><th className="num">Store credit</th><th className="a-only-desk">Method</th><th>Reference</th></tr></thead>
          <tbody>{history.rows.map((y) => (
            <tr key={y.id}>
              <td>{shortDate(y.paid_at ?? `${y.run_date}T12:00:00Z`)}</td>
              <td><Link className="a-ord" href={`/admin/partners/${y.partner_id}`}>{y.partners?.code}</Link></td>
              <td className="num">{usd(y.cash_cents)}</td><td className="num">{usd(y.credit_cents)}</td>
              <td className="a-only-desk">{y.status === "credited" ? "Store credit" : (y.method ?? "").toUpperCase() || "—"}</td>
              <td className="a-mono">{y.reference ?? <span className="muted">—</span>}</td>
            </tr>
          ))}</tbody>
        </table>
        <div className="a-plist a-only-phone">{history.rows.map((y) => (
          <div key={y.id} className="a-pord">
            <span><Link className="a-ord" href={`/admin/partners/${y.partner_id}`}>{y.partners?.code}</Link></span>
            <span className="tot">{usd(y.cash_cents)}</span>
            <span className="nm">{shortDate(y.paid_at ?? `${y.run_date}T12:00:00Z`)}</span>
            <div className="row2">
              <span>{y.status === "credited" ? `${usd(y.credit_cents)} credit` : (y.method ?? "").toUpperCase() || "—"}</span>
              <span className="a-mono">{y.reference ?? <span className="muted">—</span>}</span>
            </div>
          </div>
        ))}</div>
        <div className="a-tfoot">{`${(page - 1) * PAYOUT_PAGE_SIZE + 1}–${(page - 1) * PAYOUT_PAGE_SIZE + history.rows.length} of ${history.total}`}
          <div className="r">{page > 1 && <Link className="a-btn sm" href={histHref(page - 1)}>Previous</Link>}{page < lastPage && <Link className="a-btn sm" href={histHref(page + 1)}>Next</Link>}</div></div>
      </>)}

      <div className="a-card" style={{ marginTop: 22 }}>
        <div className="a-card-h"><h3>W-9s waiting for your check</h3><span className="sub">cash is carried until checked</span></div>
        {w9s.length === 0 ? <div className="a-card-b muted">None.</div> : w9s.map((p) => (
          <div key={p.id} className="a-trow" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
            <div><Link className="a-ord" href={`/admin/partners/${p.id}`}>{p.code}</Link><div className="t2">Uploaded {p.w9_uploaded_at ? shortDate(p.w9_uploaded_at) : "—"}{p.cash_carry_cents > 0 ? ` · ${usd(p.cash_carry_cents)} cash waiting` : ""}</div></div>
            <div className="a-acts">
              <form action={openW9Action}><input type="hidden" name="partnerId" value={p.id} /><button type="submit" className="a-btn sm">Open W-9</button></form>
              <form action={markW9CheckedAction}><input type="hidden" name="partnerId" value={p.id} /><button type="submit" className="a-btn sm primary">Mark checked</button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
