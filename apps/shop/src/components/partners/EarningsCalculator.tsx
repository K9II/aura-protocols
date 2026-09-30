"use client";

import { useState } from "react";
import { projectEarnings } from "@/lib/partners/tiers";

const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;
const payBtn = (on: boolean): React.CSSProperties => ({
  flex: 1, padding: "9px 10px", font: "14px Georgia,serif", border: "1px solid var(--ink)",
  background: on ? "var(--ink)" : "transparent", color: on ? "var(--paper)" : "var(--ink)",
});

export default function EarningsCalculator() {
  const [orders, setOrders] = useState(20);
  const [aov, setAov] = useState(180);
  const [mult, setMult] = useState<1 | 1.3>(1);
  const p = projectEarnings({ ordersPerMonth: orders, avgOrderCents: aov * 100, multiplier: mult });
  const when = [p.reachedAt[15] ? `15% from month ${p.reachedAt[15]}` : null, p.reachedAt[20] ? `20% from month ${p.reachedAt[20]}` : null]
    .filter(Boolean).join(" · ") || "Reach 15% at $15,000 of lifetime sales";

  return (
    <div style={{ border: "1px solid var(--ink)", padding: "24px", marginBottom: 48, background: "var(--paper-deep)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <p className="p-serif text-[22px]">Estimate your <em className="text-[color:var(--specimen)]">earnings</em></p>
        <p className="s-micro text-[color:var(--ink-soft)]">Illustration only · not a promise of earnings</p>
      </div>
      <div className="s-calc-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <label className="s-micro block mb-2" htmlFor="calc-orders">Orders you refer per month</label>
          <div className="p-serif text-[28px] leading-none mb-2">{orders}</div>
          <input id="calc-orders" type="range" min={1} max={200} value={orders} onChange={(e) => setOrders(Number(e.target.value))} style={{ width: "100%", accentColor: "#A32B1F" }} />
        </div>
        <div>
          <label className="s-micro block mb-2" htmlFor="calc-aov">Average order, after the 10% code</label>
          <div className="p-serif text-[28px] leading-none mb-2">${aov}</div>
          <input id="calc-aov" type="range" min={50} max={600} step={10} value={aov} onChange={(e) => setAov(Number(e.target.value))} style={{ width: "100%", accentColor: "#A32B1F" }} />
        </div>
        <div>
          <p className="s-micro mb-2">Paid as</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" aria-pressed={mult === 1} onClick={() => setMult(1)} style={payBtn(mult === 1)}>Cash</button>
            <button type="button" aria-pressed={mult === 1.3} onClick={() => setMult(1.3)} style={payBtn(mult === 1.3)}>Store credit 1.3×</button>
          </div>
        </div>
      </div>
      <div className="s-calc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <div><p className="s-micro mb-1.5">Your first month</p><p className="p-serif text-[28px] leading-none" data-testid="calc-first">{dollars(p.firstMonthCents)}</p></div>
        <div><p className="s-micro mb-1.5">Your first 12 months</p><p className="p-serif text-[28px] leading-none" data-testid="calc-year">{dollars(p.totalCents)}</p></div>
        <div>
          <p className="s-micro mb-1.5">Tier by month 12</p>
          <p className="p-serif text-[28px] leading-none" data-testid="calc-tier">{p.finalTierPct}%</p>
          <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-1.5" data-testid="calc-when">{when}</p>
        </div>
      </div>
      <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-4">Assumes the same orders every month. Each month is paid at the tier you held when it began; tiers never drop. Actual results depend on your audience and are not guaranteed.</p>
    </div>
  );
}
