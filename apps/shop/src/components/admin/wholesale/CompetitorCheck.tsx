import type { KitMargin } from "@/lib/wholesale/margins";
import { KIT_VIALS, type Tier } from "@/lib/wholesale/rules";

const usd2 = (c: number) => `$${(c / 100).toFixed(2)}`;

// What a buyer pays per vial in a kit against the cheapest competitor's single
// vial (AIOS tracker; a different strength is scaled to ours by mg).
export default function CompetitorCheck({ rows, tiers }: { rows: KitMargin[]; tiers: Tier[] }) {
  const first = tiers[0], last = tiers[tiers.length - 1];
  const list = rows.filter((r) => r.competitors.length).map((r) => {
    const c = r.competitors[0];
    const at = (t: Tier) => Math.round(r.kitListCents * (1 - t.pct / 100)) / KIT_VIALS;
    return { r, c, lo: at(first), hi: at(last), diff: ((at(first) - c.sameStrengthCents) / c.sameStrengthCents) * 100 };
  }).sort((a, b) => a.diff - b.diff);
  const under = list.filter((x) => x.diff < 0).length;

  return (
    <div className="a-card a-km-comp">
      <div className="a-card-h"><h3>Kit price per vial vs competitors</h3></div>
      <div className="a-card-b">
        {list.length === 0 ? <p>No competitor prices synced from AIOS yet.</p> : (<>
          <p className="a-km-help" style={{ marginTop: 0 }}>At {first.pct}% off, {under} of {list.length} kits cost less per vial than the cheapest competitor&apos;s single vial. Competitor prices are single vials from the AIOS tracker; their own bulk deals aren&apos;t tracked.</p>
          <div className="a-km-scroll"><table className="a-t">
            <thead><tr><th>Strength</th><th className="num">Our vial</th><th className="num">Kit vial at {first.pct}% off</th><th className="num">At {last.pct}% off</th><th>Cheapest competitor vial</th><th className="num">Kit at {first.pct}% vs them</th></tr></thead>
            <tbody>{list.map(({ r, c, lo, hi, diff }) => (
              <tr key={r.key}><td>{r.name} {r.strength}</td><td className="num">{usd2(r.kitListCents / KIT_VIALS)}</td><td className="num">{usd2(lo)}</td><td className="num">{usd2(hi)}</td>
                <td>{usd2(c.sameStrengthCents)} · {c.who}{c.sameStrengthCents !== c.priceCents && <span className="sub">{usd2(c.priceCents)} for {c.mg} mg, scaled</span>}</td>
                <td className="num"><span className={diff < 0 ? "under" : "over"}>{diff < 0 ? "" : "+"}{diff.toFixed(0)}%</span></td></tr>
            ))}</tbody>
          </table></div>
        </>)}
      </div>
    </div>
  );
}
