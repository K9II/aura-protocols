import { dateLabel } from "@/lib/today/time";

const day = (iso: string) => Date.parse(`${iso}T12:00:00Z`) / 86_400_000;

// Order-by → lot tested ≈ → ships about. Phones get the short labels (mock w8).
// With `today` (the wholesale intro, option C 2026-10-10) a timeline runs from today
// to shipping, each date placed to scale, with the days left to order.
export default function RunStrip({ cutoff, testedAbout, shipsAbout, today, style }: { cutoff: string; testedAbout: string; shipsAbout: string; today?: string; style?: React.CSSProperties }) {
  const span = today ? Math.max(1, day(shipsAbout) - day(today)) : 0;
  const at = (iso: string) => `${Math.min(100, Math.max(0, ((day(iso) - day(today!)) / span) * 100))}%`;
  const daysLeft = today ? Math.max(0, Math.round(day(cutoff) - day(today))) : 0;
  return (
    <div className={today ? "s-ws-run s-ws-run--line" : "s-ws-run"} style={style}>
      <div><span className="s-micro">Order by</span><b>{dateLabel(cutoff)}</b></div>
      <div><span className="s-micro"><span className="s-ws-long">Lot tested ≈</span><span className="s-ws-short">Tested ≈</span></span><b>{dateLabel(testedAbout)}</b></div>
      <div><span className="s-micro"><span className="s-ws-long">Ships about</span><span className="s-ws-short">Ships ≈</span></span><b>{dateLabel(shipsAbout)}</b></div>
      {today && (
        <div className="s-ws-line" aria-label={`${daysLeft} ${daysLeft === 1 ? "day" : "days"} left to order in this run`}>
          <span className="s-ws-line-fill" style={{ width: at(cutoff) }} />
          {[today, cutoff, testedAbout, shipsAbout].map((d, i) => <i key={i} style={{ left: at(d) }} className={i === 0 ? "now" : undefined} />)}
          <span className="s-ws-line-k" style={{ left: 0 }}>Today · {daysLeft} {daysLeft === 1 ? "day" : "days"} to order</span>
        </div>
      )}
    </div>
  );
}
