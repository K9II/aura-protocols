import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { getPayoutDetails, listPartners, listW9sAwaitingCheck } from "@/lib/partners/data";
import { latestRunSummary, listQueuedPayouts } from "@/lib/partners/ledger";
import { usd } from "@/lib/html";
import { markPayoutPaidAction, markW9CheckedAction, openW9Action } from "@/app/admin/payouts/actions";

export const metadata: Metadata = { title: "Payouts", robots: { index: false, follow: false } };

const box: React.CSSProperties = { border: "1px solid var(--line)", padding: "16px 18px" };
const th: React.CSSProperties = { textAlign: "left", padding: "0 18px 8px 0" };
const td: React.CSSProperties = { padding: "13px 18px 13px 0", verticalAlign: "top" };
const primary: React.CSSProperties = { padding: "8px 14px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: 0 };
const outline: React.CSSProperties = { padding: "7px 13px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: "1px solid var(--ink)", background: "transparent", color: "var(--ink)" };

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div style={box}><p className="s-micro mb-1.5">{label}</p><p className="p-serif text-[28px] leading-none">{value}</p><div className="text-[12.5px] text-[color:var(--ink-soft)] mt-1">{note}</div></div>;
}

export default async function AdminPayoutsPage() {
  await requireOwner();
  const [queued, run, approved, w9s] = await Promise.all([listQueuedPayouts(), latestRunSummary(), listPartners("approved"), listW9sAwaitingCheck()]);
  const details = await Promise.all(queued.map((p) => getPayoutDetails(p.partner_id)));
  const cashTotal = queued.reduce((s, p) => s + p.cash_cents, 0);
  const carried = approved.filter((p) => p.cash_carry_cents > 0);

  return (
    <div className="pharmacopoeia">
      <div className="p-container py-14">
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Owner · {run ? `latest payout run ${run.runDate}` : "no payout run yet"}</p>
        <h1 className="s-h1 mb-6" style={{ fontSize: 48 }}>Payouts <em>to send.</em></h1>
        <p className="mb-6 text-[12.5px]"><Link className="p-link" href="/admin/partners">← Partners</Link></p>
        <div className="s-calc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
          <Stat label="Cash to send" value={usd(cashTotal)} note={`${queued.length} partner${queued.length === 1 ? "" : "s"} · send by ACH or Zelle`} />
          <Stat label="Store credit issued" value={usd(run?.creditCents ?? 0)} note={`${run?.creditPartners ?? 0} partners · added automatically (1.3×)`} />
          <Stat label="Carried to next run" value={`${carried.length} partner${carried.length === 1 ? "" : "s"}`} note="under $100 or awaiting a W-9 check" />
        </div>
        {queued.length === 0 ? <p className="text-[color:var(--ink-soft)] mb-10">No cash payouts waiting.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr className="s-micro text-[color:var(--ink-soft)]"><th style={th}>Partner</th><th style={th}>Send to</th><th style={{ ...th, textAlign: "right" }}>Amount</th><th /></tr></thead>
              <tbody>
                {queued.map((p, i) => {
                  const d = details[i];
                  return (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={td}><span className="p-serif text-[17px]">{p.partners?.code}</span><div className="s-micro text-[color:var(--ink-soft)] mt-1">Run {p.run_date}</div></td>
                      <td style={td} className="text-sm">{p.partners?.payout_details_hint ?? "No payout method on file"}
                        {d && <details className="mt-1"><summary className="underline cursor-pointer text-[color:var(--specimen)]">Show full details</summary>
                          <p className="mt-1 text-[12.5px]">{d.kind === "ach" ? `Routing ${d.routing} · Account ${d.account} · ${d.bank}` : `Zelle ${d.handle}`}</p></details>}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}><span className="p-serif text-[17px]">{usd(p.cash_cents)}</span></td>
                      <td style={{ padding: "10px 0", textAlign: "right", verticalAlign: "top" }}>
                        <form action={markPayoutPaidAction} style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <input type="hidden" name="payoutId" value={p.id} />
                          <input name="reference" required placeholder="Reference" aria-label="Payment reference" style={{ width: 150, border: "1px solid var(--ink)", background: "var(--paper)", padding: "8px 10px", font: "13px Georgia,serif" }} />
                          <button type="submit" className="p-btn-primary" style={primary}>Mark paid</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-3 mb-10">Send the money from your bank or Zelle, then enter its reference and mark it paid. The partner gets an email receipt. Nothing is sent automatically.</p>
          </div>
        )}
        <p className="s-micro mb-3">W-9s waiting for your check</p>
        {w9s.length === 0 ? <p className="text-[12.5px] text-[color:var(--ink-soft)]">None.</p> : w9s.map((p) => (
          <div key={p.id} className="s-cart-line" style={{ gridTemplateColumns: "1fr auto", maxWidth: 760 }}>
            <div><span className="p-serif text-[17px]">{p.code}</span><div className="text-[12.5px] text-[color:var(--ink-soft)] mt-1">Uploaded {p.w9_uploaded_at ? new Date(p.w9_uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}{p.cash_carry_cents > 0 ? ` · ${usd(p.cash_carry_cents)} cash waiting` : ""}</div></div>
            <div style={{ display: "flex", gap: 8 }}>
              <form action={openW9Action}><input type="hidden" name="partnerId" value={p.id} /><button type="submit" style={outline}>Open W-9</button></form>
              <form action={markW9CheckedAction}><input type="hidden" name="partnerId" value={p.id} /><button type="submit" className="p-btn-primary" style={primary}>Mark checked</button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
