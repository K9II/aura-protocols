"use client";

import { useMemo, useState } from "react";
import type { CostInputs, KitMargin, SupplierCase } from "@/lib/wholesale/margins";
import { median, orderFulfillmentCents } from "@/lib/wholesale/margins";
import type { Tier } from "@/lib/wholesale/rules";
import OrderMargins from "@/components/admin/wholesale/OrderMargins";
import CompetitorCheck from "@/components/admin/wholesale/CompetitorCheck";
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

// Margin after the strength's lot test is shared by `kits` kits in the run. The lot
// test is absorbed (never shown to buyers); one kit alone carries all of it.
function withTest(sc: SupplierCase, tierIdx: number, testCents: number, kits: number) {
  const t = sc.tiers[tierIdx];
  const profit = t.profitCents - testCents / kits;
  return { profit, margin: t.revenueCents > 0 ? (profit / t.revenueCents) * 100 : 0 };
}

// Dot plot, one row per kit strength: lowest and highest volume tier as dots joined
// by a short bar, and a ring for the margin once this strength's lot test is shared
// by the chosen number of kits. Colours validated (dataviz checks, light surface).
export default function KitMarginsChart({ rows, missing, costs, labName, syncedAt }: { rows: KitMargin[]; missing: string[]; costs: CostInputs; labName: string | null; syncedAt: string | null }) {
  const tiers = costs.tiers, f = costs.fulfillment;
  const [mode, setMode] = useState<"low" | "high">("low");
  const [kits, setKits] = useState(1);
  const [hover, setHover] = useState<number | null>(null);
  const first = 0, last = tiers.length - 1;
  const sorted = useMemo(() => [...rows].sort((a, b) => b[mode].tiers[first].marginPct - a[mode].tiers[first].marginPct), [rows, mode]);
  if (!rows.length) return <div className="a-card"><div className="a-card-b">No kit strengths have supplier prices yet.</div></div>;

  const at = (r: KitMargin) => r[mode];
  const shared = (r: KitMargin) => withTest(at(r), first, r.labCents, kits);
  const labs = rows.map((r) => r.labCents), labLo = Math.min(...labs), labHi = Math.max(...labs);
  const labRange = labLo === labHi ? usd(labLo) : `${usd(labLo)}–${usd(labHi)}`;
  const lowest = sorted.reduce((a, r) => (at(r).tiers[last].marginPct < at(a).tiers[last].marginPct ? r : a));
  const W = 1000, L = 280, R = 66, rowH = 26, top = 26, H = top + sorted.length * rowH + 30;
  const x = (v: number) => L + (Math.max(0, Math.min(100, v)) / 100) * (W - L - R);
  const tierLabel = (t: Tier, i: number) => `${t.minKits}${tiers[i + 1] ? `–${tiers[i + 1].minKits - 1}` : "+"} kits · ${t.pct}% off`;

  return (
    <div className="a-km">
      <div className="a-kpis" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="a-kpi"><div className="l">{tierLabel(tiers[first], first)}</div><div className="v">{pct(median(sorted.map((r) => at(r).tiers[first].marginPct)))}</div><div className="d">median margin per kit</div></div>
        <div className="a-kpi"><div className="l">{tierLabel(tiers[last], last)}</div><div className="v">{pct(median(sorted.map((r) => at(r).tiers[last].marginPct)))}</div><div className="d">median margin per kit</div></div>
        <div className="a-kpi"><div className="l">{kits === 1 ? "Only kit of its strength" : `${kits} kits share the test`}</div><div className="v">{pct(median(sorted.map((r) => shared(r).margin)))}</div><div className="d">median at {tiers[first].pct}% off, lot test included</div></div>
        <div className="a-kpi"><div className="l">Lowest at {tiers[last].pct}% off</div><div className="v">{pct(at(lowest).tiers[last].marginPct)}</div><div className="d">{lowest.name} {lowest.strength}</div></div>
      </div>

      <div className="a-km-controls">
        <div className="a-km-seg" role="group" aria-label="Supplier cost">
          <span className="l">Supplier cost</span>
          <button type="button" aria-pressed={mode === "low"} onClick={() => setMode("low")}>Cheapest on file</button>
          <button type="button" aria-pressed={mode === "high"} onClick={() => setMode("high")}>Highest on file</button>
        </div>
        <label className="a-km-kits">
          <span className="l">Kits of each strength in the run</span>
          <input type="range" min={1} max={10} value={kits} onChange={(e) => setKits(Number(e.target.value))} aria-describedby="km-kits-help" />
          <b>{kits}</b>
        </label>
      </div>
      <p className="a-km-help" id="km-kits-help">Each run tests every strength once ({labName ?? "lab"}, {labRange} per strength, absorbed). Kits of the same strength share it, from all buyers in the run, so the ring moves right as more kits share the test. At 1, a lone kit pays the whole test: the worst case.</p>

      <div className="a-card">
        <div className="a-card-h"><h3>Margin by strength</h3>
          <div className="r a-km-legend" aria-hidden="true">
            <span><i style={{ background: "#6da7ec" }} />{tierLabel(tiers[first], first)}</span>
            <span><i style={{ background: "#1c5cab" }} />{tierLabel(tiers[last], last)}</span>
            <span><i className="ring" />{kits === 1 ? "Only kit of its strength (pays the whole test)" : `${kits} kits share the test`}</span>
          </div></div>
        <div className="a-card-b a-km-plot">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Margin per kit by strength at the lowest and highest volume discounts, with the lot test shared by the chosen number of kits">
            {Array.from({ length: 11 }, (_, i) => i * 10).map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={top - 8} y2={H - 26} stroke={t === 0 ? "#C9C2AE" : "#E2DCCD"} />
                <text x={x(t)} y={H - 10} textAnchor="middle" fontSize="11" fill="#857D6C">{t}%</text>
              </g>
            ))}
            <text x={W - R + 8} y={top - 10} fontSize="10" letterSpacing="1.2" fill="#857D6C">AT {tiers[first].pct}%</text>
            {sorted.map((r, i) => {
              const sc = at(r), y = top + i * rowH + rowH / 2, s = shared(r);
              const lo = sc.tiers[last].marginPct, hi = sc.tiers[first].marginPct;
              return (
                <g key={r.key} className="a-km-row" tabIndex={0} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  aria-label={`${r.name} ${r.strength}: ${pct(hi)} at ${tiers[first].pct}% off, ${pct(lo)} at ${tiers[last].pct}% off, ${pct(s.margin)} with the lot test shared by ${kits}`}>
                  <rect x={0} y={y - rowH / 2} width={W} height={rowH} fill={hover === i ? "#F3EFE6" : "transparent"} />
                  <text x={L - 12} y={y + 4} textAnchor="end" fontSize="13" fill="#1C1A15">{r.name} {r.strength}</text>
                  <line x1={x(s.margin)} x2={x(lo)} y1={y} y2={y} stroke="#E2DCCD" strokeWidth="2" />
                  <line x1={x(lo)} x2={x(hi)} y1={y} y2={y} stroke="#9aa9bf" strokeWidth="2" />
                  <circle cx={x(s.margin)} cy={y} r="5" fill="#FCFBF8" stroke="#eb6834" strokeWidth="2" />
                  <circle cx={x(lo)} cy={y} r="5.5" fill="#1c5cab" stroke="#FCFBF8" strokeWidth="2" />
                  <circle cx={x(hi)} cy={y} r="5.5" fill="#6da7ec" stroke="#FCFBF8" strokeWidth="2" />
                  <text x={W - R + 8} y={y + 4} fontSize="12" fill="#1C1A15">{pct(hi)}</text>
                </g>
              );
            })}
          </svg>
          {hover !== null && (() => {
            const r = sorted[hover], sc = at(r), s = shared(r);
            return (
              <div className="a-km-tip" style={{ top: 26 + hover * 26 + 36 }}>
                <b>{r.name} {r.strength}</b>
                <table><tbody>
                  <tr><td>Kit at list</td><td>{usd(r.kitListCents)}</td></tr>
                  <tr><td>Box ({sc.supplier})</td><td>{usd(sc.boxCents)}</td></tr>
                  <tr><td>Kit cost</td><td>{usd(sc.costCents)}</td></tr>
                  <tr><td>Lab test</td><td>{usd(r.labCents)}</td></tr>
                  {sc.tiers.map((t) => <tr key={t.pct}><td>{t.pct}% off</td><td>{pct(t.marginPct)} · {usd(t.profitCents)}</td></tr>)}
                  <tr><td>{kits === 1 ? "Lone kit + test" : `${kits} kits share test`}</td><td>{pct(s.margin)} · {usd(s.profit)}</td></tr>
                </tbody></table>
              </div>
            );
          })()}
        </div>
      </div>

      <OrderMargins rows={rows} mode={mode} costs={costs} />
      <CompetitorCheck rows={rows} tiers={tiers} />

      <div className="a-km-notes">
        <div><h3>Counted</h3><ul>
          <li>Kit price: today&apos;s retail vial price × 10, less the tier discount.</li>
          <li>Kit cost: supplier box + {usd(costs.inboundPerBoxCents)} inbound freight and customs per box + labels at ${(costs.labelPerVialCents / 100).toFixed(2)} printed{f ? ` and $${(f.labelApplyPerVialCents / 100).toFixed(2)} applied` : ""} per vial + the ${(costs.kitBoxCents / 100).toFixed(2)} kit box.</li>
          <li>Processor: card fees of 2.9% plus 30¢ on the deposit and on the balance; GLP-1 kits {costs.glpPct != null ? `${costs.glpPct}% on the GLP-1 processor (never Stripe)` : "at card rates until the GLP-1 processor is synced"}.</li>
          <li>Lot test: {labName ?? "the lab"}&apos;s price for each strength ({labRange}), once per strength per run, shared by that strength&apos;s kits (slider).</li>
          {f ? <li>3PL: {f.vendor} pick and pack, {f.postageLabel}, insurance, less the buyer&apos;s insurance: {usd(orderFulfillmentCents(costs.minKits, costs))} for a {costs.minKits}-kit order, split across its kits on the chart.{f.estimates.length > 0 && ` Still estimates in AIOS: ${f.estimates.join(", ").replaceAll("_", " ")}.`}</li>
            : <li>3PL and postage: not synced from AIOS yet, so left out.</li>}
        </ul></div>
        <div><h3>Not counted</h3><ul>
          <li>Monthly 3PL fees (storage, software, the monthly minimum) and receiving.</li>
          <li>Postage for a bigger box: a {costs.minKits}-kit order may not ship at the one-rate price; confirm with the 3PL.</li>
          <li>Supplier prices come from AIOS; &quot;Highest on file&quot; is the safe view while a supplier is unverified.</li>
          {missing.length > 0 && <li>No supplier price yet: {missing.join(", ")}.</li>}
          {syncedAt && <li>AIOS figures last synced {new Date(syncedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.</li>}
        </ul></div>
      </div>

      <details className="a-km-table">
        <summary>Table view</summary>
        <table className="a-t">
          <thead><tr><th>Strength</th><th className="num">Kit at list</th><th>Supplier box</th>{tiers.map((t) => <th key={t.pct} className="num">{t.pct}% off</th>)}<th className="num">{kits === 1 ? "Lone kit + test" : `${kits} share test`}</th></tr></thead>
          <tbody>{sorted.map((r) => { const sc = at(r), s = shared(r); return (
            <tr key={r.key}><td>{r.name} {r.strength}</td><td className="num">{usd(r.kitListCents)}</td><td>{usd(sc.boxCents)} · {sc.supplier}</td>
              {sc.tiers.map((t) => <td key={t.pct} className="num">{pct(t.marginPct)} · {usd(t.profitCents)}</td>)}
              <td className="num">{pct(s.margin)} · {usd(s.profit)}</td></tr>); })}</tbody>
        </table>
      </details>
    </div>
  );
}
