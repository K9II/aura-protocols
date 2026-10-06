import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { currentMs } from "@/lib/clock";
import { disputeRateCounts, listDisputes, listWarnings } from "@/lib/disputes/data";
import { DISPUTE_FEE_CENTS, DISPUTE_RATE_DAYS } from "@/lib/disputes/constants";
import {
  byDue, disputeStats, dueInfo, evidenceChip, fraudTypeLabel, historyRows, isOpen, orderStateChip, reasonLabel, warningActionData,
  type DisputeListRow, type WarningListRow,
} from "@/lib/disputes/rules";
import { shortDate } from "@/lib/discounts/time";
import { whenText } from "@/lib/today/time";
import { usd } from "@/lib/html";
import { Crumbs } from "@/components/admin/ui";
import WarningAction from "@/components/admin/disputes/WarningAction";

export const metadata: Metadata = { title: "Disputes", robots: { index: false, follow: false } };

const DAY = 86_400_000;
const shipNote = (d: DisputeListRow) => (d.order.shippedAt ? `shipped ${shortDate(d.order.shippedAt)}` : "not shipped");
const charged = (w: WarningListRow) => w.order.totalCents - w.order.creditCents;

// Chargebacks that need a response, early fraud warnings, and history (mock
// screen 1; phone = screen 6). Spec 2026-10-05-admin-disputes-design.md.
export default async function DisputesPage() {
  await requireOwner();
  const nowMs = currentMs();
  const [disputes, warnings, counts] = await Promise.all([
    listDisputes(), listWarnings(), disputeRateCounts(new Date(nowMs - DISPUTE_RATE_DAYS * DAY).toISOString()),
  ]);
  const s = disputeStats(disputes, warnings, counts, nowMs);
  const open = disputes.filter(isOpen).sort(byDue);
  const openWarnings = warnings.filter((w) => !w.resolved_at);
  const history = historyRows(disputes, warnings);
  const gauge = s.gaugePct >= 100 ? " red" : s.gaugePct >= 50 ? " amber" : "";

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Disputes" }]} />
      <div className="a-ph"><div><h1>Disputes</h1><p>Chargebacks and early fraud warnings. Evidence is assembled for you from the order, tracking and the customer&apos;s signed agreement.</p></div></div>

      <div className="a-rate">
        <div>
          <div className="l">Dispute rate · {DISPUTE_RATE_DAYS} days</div><div className="v">{s.rate}</div>
          <div className={`a-gauge${gauge}`}><i style={{ width: `${s.gaugePct}%` }} /><span className="t2" style={{ left: "100%" }} /></div>
          <div className="d">{s.rateSub}</div>
        </div>
        <div><div className="l">Needs response</div><div className="v">{s.needs}</div><div className="d">{s.nextDue ? `next due ${s.nextDue}` : "nothing due"}</div></div>
        <div className="a-hide-phone"><div className="l">Early warnings</div><div className="v">{s.warnings}</div><div className="d">{s.notShipped} not shipped yet</div></div>
        <div className="a-hide-phone"><div className="l">Won · 12 months</div><div className="v">{s.decided ? `${s.won} of ${s.decided}` : "—"}</div><div className="d">{usd(s.recoveredCents)} recovered</div></div>
      </div>

      <section className="a-dsec" aria-labelledby="d-needs">
        <div className="a-dsec-h"><h2 id="d-needs">Needs response</h2><span>submit before the deadline, or the bank decides without your side</span></div>
        {open.length === 0 ? <div className="a-empty">No chargebacks need a response.</div> : <>
          <table className="a-t a-only-desk">
            <thead><tr><th>Order</th><th>Customer</th><th>Reason</th><th className="num">Amount</th><th>Evidence</th><th>Respond by</th><th /></tr></thead>
            <tbody>{open.map((d) => {
              const due = dueInfo(d.evidence_due_by, nowMs), chip = evidenceChip(d);
              return (
                <tr key={d.id}>
                  <td><span className="a-mono">{d.order.number}</span><div className="a-tagnote">{shipNote(d)}</div></td>
                  <td>{d.order.customerName}<div className="a-tagnote">{d.order.email}</div></td>
                  <td><span className="a-reason">{reasonLabel(d.reason)}</span></td>
                  <td className="num">{usd(d.amount_cents)}</td>
                  <td><span className={`a-chip ${chip.tone}`}>{chip.text}</span></td>
                  <td>{due ? <span className={`a-due${due.red ? " red" : ""}`}>{due.date}<small>{due.left}</small></span> : <span className="muted">—</span>}</td>
                  <td className="num"><Link className="a-btn sm primary" href={`/admin/disputes/${d.id}`}>{d.evidence_submitted ? "Open" : "Respond"}</Link></td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="a-plist a-only-phone">{open.map((d) => {
            const due = dueInfo(d.evidence_due_by, nowMs);
            return (
              <Link key={d.id} href={`/admin/disputes/${d.id}`} className="a-pitem">
                <b><span className="a-mono">{d.order.number}</span> · {d.order.customerName}</b>
                {due ? <span className={`a-due${due.red ? " red" : ""}`}>{due.date}</span> : <span />}
                <div className="gives">{reasonLabel(d.reason)} · {usd(d.amount_cents)} · {evidenceChip(d).text.toLowerCase()}</div>
              </Link>
            );
          })}</div>
        </>}
      </section>

      <section className="a-dsec" aria-labelledby="d-efw">
        <div className="a-dsec-h"><h2 id="d-efw">Early fraud warnings</h2><span>the card network&apos;s heads-up, often days before a chargeback</span></div>
        {openWarnings.length === 0 ? <div className="a-empty">No open warnings.</div> : <>
          <table className="a-t a-efw a-only-desk">
            <thead><tr><th>Order</th><th>Customer</th><th>Warning</th><th className="num">Amount</th><th>Order status</th><th>Received</th><th className="num">Suggested</th></tr></thead>
            <tbody>{openWarnings.map((w) => {
              const st = orderStateChip(w.order);
              return (
                <tr key={w.id}>
                  <td><span className="a-mono">{w.order.number}</span></td>
                  <td>{w.order.customerName}</td>
                  <td><span className="a-reason">{fraudTypeLabel(w.fraud_type)}</span></td>
                  <td className="num">{usd(charged(w))}</td>
                  <td><span className={`a-chip ${st.cls}`}>{st.text}</span></td>
                  <td>{whenText(w.created_at, nowMs)}</td>
                  <td><div className="act"><WarningAction w={warningActionData(w)} /></div></td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="a-plist a-only-phone">{openWarnings.map((w) => {
            const st = orderStateChip(w.order);
            return (
              <div key={w.id} className="a-pitem">
                <b><span className="a-mono">{w.order.number}</span> · {w.order.customerName}</b>
                <span className={`a-chip ${st.cls}`}>{w.order.status === "paid" ? "Not shipped" : st.text}</span>
                <div className="gives">{usd(charged(w))} · {whenText(w.created_at, nowMs)}</div>
                <div className="meta"><WarningAction w={warningActionData(w)} dialogKey={`${w.id}-phone`} /></div>
              </div>
            );
          })}</div>
        </>}
        <p className="a-tagnote" style={{ marginTop: 6 }}>Refunding before a chargeback avoids the {usd(DISPUTE_FEE_CENTS)} dispute fee and keeps it off your dispute rate. After shipping, the policy is no refunds: keep watching; the evidence is ready if a chargeback follows.</p>
      </section>

      <section className="a-dsec" aria-labelledby="d-history">
        <div className="a-dsec-h"><h2 id="d-history">History</h2></div>
        {history.length === 0 ? <div className="a-empty">Nothing here yet.</div> : (
          <div className="a-scrollx">
            <table className="a-t">
              <thead><tr><th>Order</th><th>Customer</th><th>Reason</th><th className="num">Amount</th><th>Outcome</th><th>Closed</th></tr></thead>
              <tbody>{history.map((h) => (
                <tr key={h.key}>
                  <td>{h.href ? <Link className="a-ord" href={h.href}>{h.orderNumber}</Link> : <span className="a-mono">{h.orderNumber}</span>}</td>
                  <td>{h.customer}</td>
                  <td><span className="a-reason">{h.reason}</span></td>
                  <td className="num">{usd(h.amountCents)}</td>
                  <td><span className={`a-chip ${h.chip.tone}`}>{h.chip.text}</span></td>
                  <td>{h.when}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
