import Link from "next/link";
import type { Overview } from "@/lib/email/stats";
import { fmtPct, pct, rateTone, runHealth, type RunRow } from "@/lib/email/health";
import { BOUNCE_LIMIT_PCT, BOUNCE_WARN_PCT, COMPLAINT_LIMIT_PCT, COMPLAINT_WARN_PCT } from "@/lib/email/constants";

const n = (x: number) => x.toLocaleString("en-US");

function Gauge({ value, warn, limit }: { value: number; warn: number; limit: number }) {
  const tone = rateTone(value, warn, limit);
  return (
    <div className={`a-gauge ${tone}`} aria-hidden>
      <i style={{ width: `${Math.min(100, (value / limit) * 100)}%` }} />
      <span className="t1" style={{ left: `${(warn / limit) * 100}%` }} /><span className="t2" style={{ left: "100%" }} />
    </div>
  );
}

export function HealthStrip({ o }: { o: Overview }) {
  const bounce = pct(o.bounces_30d, o.sent_30d), complaint = pct(o.complaints_30d, o.sent_30d);
  const trend = o.sent_prior_30d ? Math.round(((o.sent_30d - o.sent_prior_30d) / o.sent_prior_30d) * 100) : null;
  return (
    <div className="a-kpis" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
      <div className="a-kpi"><div className="l">Subscribers</div><div className="v">{n(o.confirmed)} <small>confirmed</small></div><div className="split"><span><b>{n(o.pending)}</b> pending</span><span><b>{n(o.unsubscribed)}</b> unsubscribed</span></div></div>
      <div className="a-kpi"><div className="l">Sent · 30 days</div><div className="v">{n(o.sent_30d)}</div><div className="d">{trend == null ? "first 30 days" : <><span className={trend >= 0 ? "up" : "down"}>{trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%</span> vs prior 30</>}</div></div>
      <div className="a-kpi"><div className="l">Bounce rate · 30 days</div><div className="v">{fmtPct(bounce)}</div><Gauge value={bounce} warn={BOUNCE_WARN_PCT} limit={BOUNCE_LIMIT_PCT} /><div className="d">{n(o.bounces_30d)} bounced · Amazon limit {BOUNCE_LIMIT_PCT}%</div></div>
      <div className="a-kpi"><div className="l">Complaint rate · 30 days</div><div className="v">{fmtPct(complaint)}</div><Gauge value={complaint} warn={COMPLAINT_WARN_PCT} limit={COMPLAINT_LIMIT_PCT} /><div className="d">{n(o.complaints_30d)} complaint{o.complaints_30d === 1 ? "" : "s"} · Amazon limit {COMPLAINT_LIMIT_PCT}%</div></div>
    </div>
  );
}

export function RunLine({ last }: { last: RunRow | null }) {
  const h = runHealth(last);
  return (
    <div className={`a-runline${h.tone === "red" ? " bad" : ""}`} role={h.tone === "red" ? "alert" : undefined}>
      <span className="dot" /><span><b>Hourly email run</b> · {h.title}</span><span className="sep" /><span>{h.detail}</span>
      <Link href="/admin/email/runs">Run history</Link>
    </div>
  );
}
