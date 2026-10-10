"use client";

import { useState } from "react";
import { projectEarnings } from "@/lib/partners/tiers";

const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

export default function EarningsCalculator() {
  const [orders, setOrders] = useState(20);
  const [aov, setAov] = useState(180);
  const [mult, setMult] = useState<1 | 1.3>(1);
  const p = projectEarnings({ ordersPerMonth: orders, avgOrderCents: aov * 100, multiplier: mult });
  const when = [p.reachedAt[15] ? `15% from month ${p.reachedAt[15]}` : null, p.reachedAt[20] ? `20% from month ${p.reachedAt[20]}` : null]
    .filter(Boolean).join(" · ") || "Reach 15% at $15,000 of lifetime sales";

  return (
    // A raised panel like the product page's buy box (affiliate option B, 2026-10-10).
    <div className="s-pp-panel s-pp-calc">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <h2 className="s-pp-h2">Estimate your <em>earnings</em></h2>
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
          <div className="s-seg s-pp-seg">
            <button type="button" aria-pressed={mult === 1} onClick={() => setMult(1)}>Cash</button>
            <button type="button" aria-pressed={mult === 1.3} onClick={() => setMult(1.3)}>Store credit 1.3×</button>
          </div>
        </div>
      </div>
      <div className="s-calc-grid s-pp-out">
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
