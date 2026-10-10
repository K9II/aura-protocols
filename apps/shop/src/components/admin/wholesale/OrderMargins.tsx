"use client";

import { useState } from "react";
import { orderMargin, type CostInputs, type KitMargin } from "@/lib/wholesale/margins";
import { MIN_KITS_PER_STRENGTH as PER } from "@/lib/wholesale/rules";

const usd = (c: number) => `${c < 0 ? "−" : ""}$${Math.round(Math.abs(c) / 100).toLocaleString("en-US")}`;
const usd2 = (c: number) => `${c < 0 ? "−" : ""}$${(Math.abs(c) / 100).toFixed(2)}`;
type Line = { key: string; kits: number };

// Try an order: pick strengths and kits; the tier, lot tests, processor and 3PL
// follow the order the way checkout and a production run would.
export default function OrderMargins({ rows, mode, costs }: { rows: KitMargin[]; mode: "low" | "high"; costs: CostInputs }) {
  const byName = [...rows].sort((a, b) => a.name.localeCompare(b.name) || a.kitListCents - b.kitListCents);
  const min = costs.minKits;
  // The worst case for the lab first: the minimum spread over as many strengths as allowed.
  const spread = Math.max(1, Math.floor(min / PER));
  const presets: Array<[string, Line[]]> = [
    [`${spread} strengths × ${PER} kits`, byName.slice(0, spread).map((r, i) => ({ key: r.key, kits: PER + (i === 0 ? min - spread * PER : 0) }))],
    [`1 strength × ${min} kits`, byName.slice(0, 1).map((r) => ({ key: r.key, kits: Math.max(min, PER) }))],
    ["2 strengths × 5 kits", byName.slice(0, 2).map((r) => ({ key: r.key, kits: 5 }))],
  ];
  const [lines, setLines] = useState<Line[]>(presets[0][1]);
  const [adding, setAdding] = useState(byName[0]?.key ?? "");
  const set = (key: string, kits: number) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, kits: Math.max(PER, Math.min(50, kits || PER)) } : l)));
  const add = () => setLines((ls) => (ls.some((l) => l.key === adding) ? ls.map((l) => (l.key === adding ? { ...l, kits: l.kits + 1 } : l)) : [...ls, { key: adding, kits: PER }]));
  const used = lines.flatMap((l) => { const m = rows.find((r) => r.key === l.key); return m ? [{ m, kits: l.kits }] : []; });
  const o = orderMargin(used, mode, costs);
  const f = costs.fulfillment;

  return (
    <div className="a-card a-km-order">
      <div className="a-card-h"><h3>Try an order</h3><div className="r">
        {presets.map(([label, ls]) => <button key={label} type="button" className="a-km-mini" onClick={() => setLines(ls)}>{label}</button>)}
      </div></div>
      <div className="a-card-b">
        <div className="a-km-order-grid">
          <div>
            <div className="a-km-scroll"><table className="a-t"><thead><tr><th>Strength</th><th className="num">Kits</th><th className="num">Lab test</th><th /></tr></thead>
              <tbody>{used.map(({ m, kits }) => (
                <tr key={m.key}><td>{m.name} {m.strength}{m.glp && <span className="a-km-flag">GLP-1</span>}</td>
                  <td className="num"><input type="number" min={PER} max={50} value={kits} onChange={(e) => set(m.key, Number(e.target.value))} aria-label={`Kits of ${m.name} ${m.strength}`} /></td>
                  <td className="num">{usd(m.labCents)}</td>
                  <td><button type="button" className="a-km-mini ghost" onClick={() => setLines((ls) => ls.filter((l) => l.key !== m.key))} aria-label={`Remove ${m.name} ${m.strength}`}>Remove</button></td></tr>
              ))}</tbody></table></div>
            <div className="a-km-add">
              <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Strength to add">
                {byName.map((r) => <option key={r.key} value={r.key}>{r.name} {r.strength}</option>)}
              </select>
              <button type="button" className="a-km-mini" onClick={add}>Add a kit</button>
            </div>
          </div>
          <dl className="a-km-sum">
            <div><dt>{o.kits} kits · {o.tier.pct}% off{o.belowMinimum ? ` (below the ${min}-kit minimum)` : ""}</dt><dd>{usd(o.revenueCents)}</dd></div>
            <div><dt>Product: boxes, freight, labels, kit boxes ({mode === "low" ? "cheapest" : "highest"} supplier)</dt><dd>−{usd(o.productCents)}</dd></div>
            <div><dt>Lab tests ({used.length} {used.length === 1 ? "strength" : "strengths"}, each paid in full)</dt><dd>−{usd(o.labCents)}</dd></div>
            <div><dt>{o.glp ? (costs.glpPct != null ? `GLP-1 processor ${costs.glpPct}%` : "Card fees (GLP-1 processor not synced)") : "Card fees, deposit + balance"}</dt><dd>−{usd(o.feesCents)}</dd></div>
            <div><dt>{f ? `${f.vendor}: pick, pack, ${f.postageLabel}, insurance, less the buyer's insurance` : "3PL and postage (not synced from AIOS)"}</dt><dd>−{usd(o.fulfillmentCents)}</dd></div>
            <div className="tot"><dt>Profit</dt><dd>{usd(o.profitCents)}</dd></div>
            <div className="tot"><dt>Margin</dt><dd>{o.marginPct.toFixed(1)}%</dd></div>
            <div><dt>Profit per vial</dt><dd>{usd2(o.perVialCents)}</dd></div>
          </dl>
        </div>
        <p className="a-km-help">Worst case for the lab: this order is alone in its run, so it pays every strength&apos;s test. Other buyers&apos; kits of the same strengths in the run share those tests and lift the margin.</p>
      </div>
    </div>
  );
}
