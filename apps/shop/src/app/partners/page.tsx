import type { Metadata } from "next";
import Link from "next/link";
import { requirePartner } from "@/lib/dal";
import { clicksSince } from "@/lib/partners/data";
import { creditBalance, partnerLedger } from "@/lib/partners/ledger";
import { CLEARING_DAYS, CODE_DISCOUNT_PCT, REF_WINDOW_DAYS, TIERS, nextTier } from "@/lib/partners/tiers";
import { cashOwedNote, commissionChip, nextCashPayout } from "@/lib/partners/dashboard";
import { usd } from "@/lib/html";
import { siteUrl } from "@/lib/supabase/env";
import CopyButton from "@/components/partners/CopyButton";
import ChangeCode from "@/components/partners/ChangeCode";
import PartnerRecord from "@/components/partners/PartnerRecord";
import PayoutSettings from "@/components/partners/PayoutSettings";
import W9Upload from "@/components/partners/W9Upload";

export const metadata: Metadata = { title: "Partner dashboard", robots: { index: false, follow: false } };

// Whole-dollar thresholds ("$15,000", not "$15,000.00").
const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;
const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
// Run dates are date-only (YYYY-MM-DD); read them as UTC so they never show the day before.
const runDay = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
// Not a component (lowercase, no JSX) — keeps the impure Date.now() call out of the page component's render.
function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
}
function today(): Date {
  return new Date();
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

function Fig({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <div>
      <span className="s-micro text-[color:var(--ink-soft)]">{label}</span>
      <b style={tone ? { color: tone } : undefined}>{value}</b>
      <small>{note}</small>
    </div>
  );
}

// Option A "Partner placard" (approved 2026-10-11, artifact PQYjVexNx2ZBgq9VNxskGo):
// the hero mirrors /affiliates (facts left, the partner record as a placard with
// the code tag right), one raised figure strip, then commission and getting paid.
export default async function PartnerDashboard() {
  const { customer, partner } = await requirePartner();
  if (partner.status === "applied") return <Shell eyebrow="Partner · application received"><p className="text-[15px]">Thanks — we&apos;re reviewing your application for code <b>{partner.code}</b> and will email {customer.email} with the decision.</p></Shell>;
  if (partner.status === "declined") return <Shell eyebrow="Partner"><p className="text-[15px]">We weren&apos;t able to approve your application. You&apos;re welcome to contact us if your channel or focus changes.</p></Shell>;
  if (partner.status === "suspended") return <Shell eyebrow="Partner · suspended"><p className="text-[15px]">Your partner code is suspended. Store credit already issued stays on your account.</p></Shell>;

  const since = daysAgoIso(30);
  const [ledger, clicks, balance] = await Promise.all([partnerLedger(partner.id), clicksSince(partner.id, since), creditBalance(customer.id)]);
  const link = `${siteUrl().replace(/^https?:\/\//, "")}/?ref=${partner.code.toLowerCase()}`;
  const next = nextTier(partner.lifetime_cents);
  const nextCash = nextCashPayout(today());
  const tierIndex = TIERS.findIndex((t) => t.pct === partner.tier_pct);

  return (
    <div className="pharmacopoeia"><div className="p-container py-14">
      <section className="s-pp-hero">
        <div>
          <p className="s-micro s-eyebrow">Partner · approved {partner.approved_at ? fmt(partner.approved_at) : ""}</p>
          <h1 className="s-h1 mb-4" style={{ fontSize: 52 }}>Your partner <em>dashboard.</em></h1>
          <p className="s-pp-lede">Share your code or link. Your audience saves {CODE_DISCOUNT_PCT}%, and every order it brings in shows up here.</p>
          <dl className="s-pd-facts">
            <div><dt>Your code</dt><dd><span className="s-pd-code">{partner.code}</span><CopyButton text={partner.code} /></dd></div>
            <div><dt>Your link</dt><dd><span>{link}</span><CopyButton text={`https://${link}`} /></dd></div>
            <div><dt>Link credit</dt><dd>{REF_WINDOW_DAYS} days after a click</dd></div>
            <div><dt>Next cash payout</dt><dd>{nextCash}</dd></div>
          </dl>
          <ChangeCode code={partner.code} />
        </div>
        <PartnerRecord p={partner} />
      </section>

      <div className="s-pp-panel s-pd-figs">
        <Fig label="Clicks · 30 days" value={clicks.toLocaleString("en-US")} note="link visits" />
        <Fig label="Orders · 30 days" value={String(ledger.ordersLast30)} note="with commission" />
        <Fig label="Pending + clearing" value={usd(ledger.byState.pending + ledger.byState.clearing)} note={`clears ${CLEARING_DAYS} days after shipping`} />
        <Fig label="Cash owed" value={usd(Math.max(0, partner.cash_carry_cents))} tone="var(--tested)"
          note={cashOwedNote({ carryCents: partner.cash_carry_cents, w9Checked: !!partner.w9_checked_at, next: nextCash })} />
        <Fig label="Paid to date" value={usd(ledger.receivedCents)} note={`store credit ${usd(balance)}`} />
      </div>

      <div className="s-pd-two">
        <div>
          <div className="s-pd-h"><h2 className="s-pp-h2">Your <em>commission</em></h2><span className="s-micro text-[color:var(--ink-soft)]">Newest first</span></div>
          {ledger.recent.length === 0 ? <p className="text-[color:var(--ink-soft)] text-sm">No orders yet — share your code to get started.</p> : (
            <div className="s-pp-panel" style={{ overflowX: "auto" }}>
              <table className="s-pd-table" aria-label="Your commission">
                <thead><tr><th>Order</th><th>Date</th><th>Via</th><th className="r">Order value</th><th className="r">Earned</th><th>Status</th></tr></thead>
                <tbody>
                  {ledger.recent.map((c) => {
                    const chip = commissionChip(c);
                    return (
                      <tr key={c.id} className={c.state === "void" ? "void" : undefined}>
                        <td className="ord">{c.orders?.order_number ?? "—"}</td>
                        <td className="dt hide-s">{fmt(c.created_at)}</td>
                        <td className="hide-s">{c.attributed_by === "code" ? "Code" : "Link"}</td>
                        <td className="r hide-s">{usd(c.base_cents)}</td>
                        <td className="r amt">{usd(c.amount_cents)}</td>
                        <td className="stc"><span className={`s-st s-st--${chip.tone}`}>{chip.label}</span></td>
                        <td className="meta">{fmt(c.created_at)} · {usd(c.base_cents)} order</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="s-pp-note">Every order earns your tier rate. Customers are shown by order number only. Refunded orders are removed; if one was already paid, it comes off your next payout.</p>
        </div>

        <aside className="s-pd-side">
          <div>
            <div className="s-pd-h"><h2 className="s-pp-h2">Your <em>tier</em></h2><span className="s-micro text-[color:var(--ink-soft)]">{next ? `${usd(next.remainingCents)} to ${next.pct}%` : "Top tier"}</span></div>
            <div className="s-pp-panel">
              <table className="s-pp-tiers s-pd-ladder">
                <thead><tr><th>Lifetime referred sales</th><th>Commission</th></tr></thead>
                <tbody>
                  {TIERS.map((t, i) => (
                    <tr key={t.pct} className={i === tierIndex ? "now" : undefined}>
                      <td>{t.fromCents === 0 ? "From your first order" : dollars(t.fromCents)}{i === tierIndex && <> · <b>you&apos;re here</b></>}</td>
                      <td>{t.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="s-pp-steps" aria-hidden>
                {TIERS.map((t, i) => <i key={t.pct} className={i === tierIndex ? undefined : "off"} style={{ height: `${(t.pct / TIERS[TIERS.length - 1].pct) * 100}%` }} />)}
              </div>
            </div>
          </div>
          <div>
            <PayoutSettings pref={partner.payout_pref} splitCashPct={partner.split_cash_pct} methodHint={partner.payout_details_hint} />
            <W9Upload uploadedAt={partner.w9_uploaded_at} checkedAt={partner.w9_checked_at} />
            <p className="s-micro mt-6 mb-2">Payout history</p>
            {ledger.payouts.length === 0 ? <p className="text-[12.5px] text-[color:var(--ink-soft)]">No payouts yet.</p> : ledger.payouts.map((p) => (
              <div key={p.id} className="s-cart-line">
                <div className="text-[14px]">{runDay(p.run_date)} · {[p.cash_cents ? `${usd(p.cash_cents)} cash` : null, p.credit_cents ? `${usd(p.credit_cents)} credit` : null].filter(Boolean).join(" + ")}</div>
                <div className="s-micro text-right">{p.status === "queued" ? "Cash being sent" : p.status === "paid" ? `Sent · ref ${p.reference}` : "Credit added"}</div>
              </div>
            ))}
            <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-4">Rules: <Link className="p-link" href="/partner-agreement">Partner Agreement</Link></p>
          </div>
        </aside>
      </div>
    </div></div>
  );
}
