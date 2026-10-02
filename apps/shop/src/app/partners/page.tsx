import type { Metadata } from "next";
import Link from "next/link";
import { requirePartner } from "@/lib/dal";
import { clicksSince } from "@/lib/partners/data";
import { creditBalance, partnerLedger } from "@/lib/partners/ledger";
import { nextTier } from "@/lib/partners/tiers";
import { heldCash } from "@/lib/partners/payout-math";
import { usd } from "@/lib/html";
import { siteUrl } from "@/lib/supabase/env";
import CopyButton from "@/components/partners/CopyButton";
import ChangeCode from "@/components/partners/ChangeCode";
import PayoutSettings from "@/components/partners/PayoutSettings";
import W9Upload from "@/components/partners/W9Upload";

export const metadata: Metadata = { title: "Partner dashboard", robots: { index: false, follow: false } };

const box: React.CSSProperties = { border: "1px solid var(--line)", padding: "16px 18px" };
const th: React.CSSProperties = { textAlign: "left", padding: "0 18px 8px 0" };
const td: React.CSSProperties = { padding: "13px 18px 13px 0", verticalAlign: "top" };
const STATE_LABEL = { pending: "Pending", clearing: "Clearing", payable: "Payable", paid: "In payout", void: "Removed" } as const;
const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
// Not a component (lowercase, no JSX) — keeps the impure Date.now() call out of the page component's render.
function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={box}>
      <p className="s-micro mb-1.5">{label}</p>
      <p className="p-serif text-[28px] leading-none">{value}</p>
      {note && <div className="text-[12.5px] text-[color:var(--ink-soft)] mt-1">{note}</div>}
    </div>
  );
}

function Shell({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="pharmacopoeia"><div className="p-container py-14">
      <p className="s-micro text-[color:var(--specimen)] mb-2.5">{eyebrow}</p>
      <h1 className="s-h1 mb-6" style={{ fontSize: 48 }}>Your <em>partner</em> dashboard.</h1>
      {children}
    </div></div>
  );
}

export default async function PartnerDashboard() {
  const { customer, partner } = await requirePartner();
  if (partner.status === "applied") return <Shell eyebrow="Partner · application received"><p className="text-[15px]">Thanks — we&apos;re reviewing your application for code <b>{partner.code}</b> and will email {customer.email} with the decision.</p></Shell>;
  if (partner.status === "declined") return <Shell eyebrow="Partner"><p className="text-[15px]">We weren&apos;t able to approve your application. You&apos;re welcome to contact us if your channel or focus changes.</p></Shell>;
  if (partner.status === "suspended") return <Shell eyebrow="Partner · suspended"><p className="text-[15px]">Your partner code is suspended. Store credit already issued stays on your account.</p></Shell>;

  const since = daysAgoIso(30);
  const [ledger, clicks, balance] = await Promise.all([partnerLedger(partner.id), clicksSince(partner.id, since), creditBalance(customer.id)]);
  const link = `${siteUrl().replace(/^https?:\/\//, "")}/?ref=${partner.code.toLowerCase()}`;
  const next = nextTier(partner.lifetime_cents);
  const progress = next ? Math.min(100, Math.round((partner.lifetime_cents / next.fromCents) * 100)) : 100;
  const today = new Date();
  const nextPayout = today.getUTCDate() < 15 ? "the 15th" : "the 1st";
  const held = heldCash({ carryCents: partner.cash_carry_cents, w9Checked: !!partner.w9_checked_at });

  return (
    <Shell eyebrow={`Partner · approved ${partner.approved_at ? fmt(partner.approved_at) : ""}`}>
      <div className="s-calc-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16, marginBottom: 16 }}>
        <div style={box}><p className="s-micro mb-1.5">Your code</p><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="p-serif text-[28px]">{partner.code}</span><CopyButton text={partner.code} /></div><ChangeCode code={partner.code} /></div>
        <div style={box}><p className="s-micro mb-1.5">Your link · counts for 60 days after a click</p><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}><span className="text-[15px]" style={{ overflowWrap: "anywhere" }}>{link}</span><CopyButton text={`https://${link}`} /></div></div>
      </div>
      <div className="s-calc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, marginBottom: 16 }}>
        <Stat label="Clicks · 30 days" value={clicks.toLocaleString("en-US")} />
        <Stat label="Orders · 30 days" value={String(ledger.ordersLast30)} />
        <Stat label="Pending + clearing" value={usd(ledger.byState.pending + ledger.byState.clearing)} note="clears 15 days after shipping" />
        <Stat label="Payable" value={usd(ledger.byState.payable + (held?.cents ?? 0))}
          note={held ? `includes ${usd(held.cents)} held until ${held.reason === "w9" ? "your W-9 is checked" : "cash reaches $100"}` : `next payout ${nextPayout}`} />
        <Stat label="Paid to date" value={usd(ledger.receivedCents)} />
      </div>
      <div className="s-calc-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginBottom: 32 }}>
        <div style={box}>
          <p className="s-micro mb-2">Tier · {partner.tier_pct}% now</p>
          <div className="s-freeship" style={{ height: 6 }}><i style={{ width: `${progress}%` }} /></div>
          <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-2">
            {usd(partner.lifetime_cents)} of lifetime referred sales{next ? ` · ${usd(next.remainingCents)} more to reach ${next.pct}%.` : " · you're at the top tier."}{next?.pct === 15 ? " Then 20% at $40,000." : ""}
          </p>
        </div>
        <div style={box}>
          <p className="s-micro mb-1.5">Store credit</p>
          <p className="p-serif text-[28px] leading-none">{usd(balance)}</p>
          <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-1.5">Applied automatically at your checkout.</p>
        </div>
      </div>
      <div className="s-partner-grid" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 48 }}>
        <div>
          <p className="s-micro mb-3">Recent commission</p>
          {ledger.recent.length === 0 ? <p className="text-[color:var(--ink-soft)] text-sm">No orders yet — share your code to get started.</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr className="s-micro text-[color:var(--ink-soft)]"><th style={th}>Order</th><th style={th}>Date</th><th style={th}>Via</th><th style={{ ...th, textAlign: "right" }}>Order value</th><th style={{ ...th, textAlign: "right" }}>Rate</th><th style={{ ...th, textAlign: "right" }}>Earned</th><th style={th}>Status</th></tr></thead>
                <tbody>
                  {ledger.recent.map((c) => (
                    <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ ...td, whiteSpace: "nowrap" }}><span className="p-serif text-[17px]">{c.orders?.order_number ?? "—"}</span></td>
                      <td style={td} className="text-sm">{fmt(c.created_at)}</td>
                      <td style={td} className="text-sm">{c.attributed_by === "code" ? "Code" : "Link"}</td>
                      <td style={{ ...td, textAlign: "right" }} className="text-sm">{usd(c.base_cents)}</td>
                      <td style={{ ...td, textAlign: "right" }} className="text-sm">{c.rate_pct}%</td>
                      <td style={{ ...td, textAlign: "right" }} className="text-sm">{usd(c.amount_cents)}</td>
                      <td style={td}><span className="s-micro" style={{ color: c.state === "payable" ? "var(--specimen)" : "var(--ink-soft)" }}>{STATE_LABEL[c.state]}{c.state === "clearing" && c.clears_at ? ` · ${fmt(c.clears_at)}` : ""}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-3">Customers are shown by order number only. Refunded orders are removed; if one was already paid, it comes off your next payout.</p>
        </div>
        <div>
          <PayoutSettings pref={partner.payout_pref} splitCashPct={partner.split_cash_pct} methodHint={partner.payout_details_hint} />
          <W9Upload uploadedAt={partner.w9_uploaded_at} checkedAt={partner.w9_checked_at} />
          <p className="s-micro mt-6 mb-2">Payout history</p>
          {ledger.payouts.length === 0 ? <p className="text-[12.5px] text-[color:var(--ink-soft)]">No payouts yet.</p> : ledger.payouts.map((p) => (
            <div key={p.id} className="s-cart-line">
              <div className="text-[14px]">{fmt(p.run_date)} · {[p.cash_cents ? `${usd(p.cash_cents)} cash` : null, p.credit_cents ? `${usd(p.credit_cents)} credit` : null].filter(Boolean).join(" + ")}</div>
              <div className="s-micro text-right">{p.status === "queued" ? "Cash being sent" : p.status === "paid" ? `Sent · ref ${p.reference}` : "Credit added"}</div>
            </div>
          ))}
          <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-4">Rules: <Link className="p-link" href="/partner-agreement">Partner Agreement</Link></p>
        </div>
      </div>
    </Shell>
  );
}
