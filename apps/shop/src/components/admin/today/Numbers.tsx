// Today's right column: sales, orders, accounts, the chart and top strengths
// for the chosen period (mock screens 1, 2, 4, 5).
import Link from "next/link";
import { Icon } from "@/components/admin/ui";
import { PERIODS, PERIOD_LABEL, PERIOD_SHORT, type Period } from "@/lib/today/periods";
import type { Change, NumbersView } from "@/lib/today/numbers";

function Chg({ c, suffix }: { c: Change; suffix?: string }) {
  if (!c) return null;
  return <span className={`chg ${c.dir}`}>{c.text}{suffix ? ` ${suffix}` : ""}</span>;
}

export default function Numbers({ period, view, reloadHref }: { period: Period; view: NumbersView | null; reloadHref: string }) {
  return (
    <section className="a-nums" aria-labelledby="t-numbers">
      <div className="a-nums-h">
        <h2 id="t-numbers">Numbers</h2>
        <nav className="a-per" aria-label="Period">
          {PERIODS.map((p) => (
            <Link key={p} href={p === "today" ? "/admin" : `/admin?p=${p}`} className={p === period ? "on" : undefined} aria-current={p === period ? "page" : undefined}>
              <span className="long">{PERIOD_LABEL[p]}</span><span className="short">{PERIOD_SHORT[p]}</span>
            </Link>
          ))}
        </nav>
      </div>
      {!view ? (
        <div className="a-failed" role="alert"><Icon name="warn" /><span>Couldn&apos;t load the numbers.</span><a className="a-btn sm" href={reloadHref}>Reload</a></div>
      ) : (
        <>
          <div className="a-hero">
            <div className="l">Sales · goods after discounts</div>
            <div className="v">{view.sales} <Chg c={view.salesChange} suffix={view.vs} /></div>
            <div className="sub">charged <b>{view.charged}</b> · shipping <b>{view.shipping}</b> · tax <b>{view.tax}</b></div>
            {view.refund && <div className="ref">{view.refund}</div>}
            {view.profit === "error"
              ? <div className="pro">Profit · couldn&apos;t load</div>
              : <div className="pro">Profit <b>{view.profit.value}</b>{view.profit.margin && <> · {view.profit.margin}</>} <Chg c={view.profit.change} suffix={view.vs} />
                  {view.profit.note && <span className="n"> · {view.profit.note}</span>}</div>}
          </div>
          <div className="a-mini">
            {view.minis.map((mi) => (
              <div key={mi.label}>
                <div className="l"><span className="long">{mi.label}</span><span className="short">{mi.short}</span></div>
                <div className="v">{mi.value}</div>
                <div className="d">{mi.change ? <Chg c={mi.change} suffix={mi.suffix} /> : mi.note}</div>
              </div>
            ))}
          </div>
          <div className="a-chart">
            <div className="l"><span>{view.chart.title}</span><span>{view.chart.range}</span></div>
            <div className="a-bars" role="img" aria-label={`${view.chart.title}, ${view.chart.range}`}>
              {view.chart.bars.map((b) => (
                <i key={b.key} title={b.tip} className={[b.zero ? "z" : "", b.now ? "now" : ""].filter(Boolean).join(" ") || undefined} style={{ height: `${b.h}%` }} />
              ))}
            </div>
            <div className="a-axis">{view.chart.axis.map((a, i) => <span key={i}>{a}</span>)}</div>
          </div>
          <div className="a-top5">
            <div className="l">{view.topTitle}</div>
            {view.top.length === 0 ? <div className="muted">No sales in this period.</div> : (
              <table>
                <tbody>
                  {view.top.map((t) => (
                    <tr key={t.rank}>
                      <td className="k">{t.rank}</td>
                      <td>{t.label}<div className="bar"><i style={{ width: `${t.pct}%` }} /></div></td>
                      <td className="num vials">{t.vials}</td>
                      <td className="num">{t.sales}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}
