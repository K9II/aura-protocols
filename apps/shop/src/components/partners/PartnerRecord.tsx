import { PARTNER_TYPES } from "@/lib/partners/codes";
import type { PayoutPref } from "@/lib/partners/payout-math";
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";
import { usd } from "@/lib/html";

const md = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// The dashboard's hero tile: the partner's record as a Monograph-style placard,
// with their code on a hanging tag in front (same build as /affiliates).
// Option A, approved 2026-10-11 (artifact PQYjVexNx2ZBgq9VNxskGo).
export default function PartnerRecord({ p }: { p: {
  code: string; partner_type: string; tier_pct: number; lifetime_cents: number;
  payout_pref: PayoutPref; split_cash_pct: number; w9_checked_at: string | null; approved_at: string | null;
} }) {
  const type = PARTNER_TYPES.find((t) => t.id === p.partner_type)?.label ?? "Partner";
  const paidAs = p.payout_pref === "cash" ? "All cash" : p.payout_pref === "credit" ? "All store credit" : `${p.split_cash_pct}% cash · ${100 - p.split_cash_pct}% credit`;
  return (
    <div className="s-pp-tile s-pd-tile" aria-label="Your partner record">
      <div className="s-pp-placard">
        <span className="s-pp-k">Partner record · Aura Protocols</span>
        <span className="s-pp-n">{p.code}</span>
        <dl>
          <dt>Type</dt><dd>{type}</dd>
          <dt>Tier</dt><dd>{p.tier_pct}% · never drops</dd>
          <dt>Lifetime</dt><dd>{usd(p.lifetime_cents)} referred</dd>
          <dt>Paid as</dt><dd>{paidAs}</dd>
          <dt>W-9</dt><dd style={p.w9_checked_at ? { color: "var(--tested)" } : undefined}>{p.w9_checked_at ? `Checked ${md(p.w9_checked_at)}` : "Not checked yet"}</dd>
        </dl>
        <span className="s-placard-r">{p.approved_at ? `Partner since ${md(p.approved_at)} · ` : ""}research use only</span>
      </div>
      <div className="s-pp-tag s-pp-code"><span>Your code</span><b>{p.code}</b><i>{CODE_DISCOUNT_PCT}% off</i></div>
    </div>
  );
}
