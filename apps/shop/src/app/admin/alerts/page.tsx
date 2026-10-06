import type { Metadata } from "next";
import { requireOwner } from "@/lib/dal";
import { currentMs } from "@/lib/clock";
import { listPastAlerts } from "@/lib/today/alerts";
import { firstLine } from "@/lib/today/alert-rules";
import { ALERTS_KEEP_DAYS } from "@/lib/today/constants";
import { dateTime, shortDate } from "@/lib/discounts/time";
import { Crumbs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Past alerts", robots: { index: false, follow: false } };

export default async function PastAlertsPage() {
  await requireOwner();
  const alerts = await listPastAlerts(currentMs());
  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Today", href: "/admin" }, { label: "Past alerts" }]} />
      <div className="a-ph"><div><h1>Past alerts</h1><p>The last {ALERTS_KEEP_DAYS} days. Every alert was also emailed to you when it happened.</p></div></div>
      {alerts.length === 0 ? <div className="a-empty">No alerts in the last {ALERTS_KEEP_DAYS} days.</div> : (
        <>
          <div className="a-scrollx">
            <table className="a-t a-at">
              <thead><tr><th>Alert</th><th>Status</th><th className="num">Times</th><th>First</th><th>Last</th><th>Done</th></tr></thead>
              <tbody>
                {alerts.map((a) => {
                  const head = firstLine(a.detail);
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="ttl">{a.title}</div>
                        {head && <div className="det">{head}</div>}
                        {a.detail.trim() !== head && <details><summary>Full detail</summary><pre className="a-pre">{a.detail}</pre></details>}
                        {a.note && <div className="note">&ldquo;{a.note}&rdquo;</div>}
                      </td>
                      <td>{a.resolved_at ? <span className="a-chip ended">Done</span> : <span className="a-chip refund">Open</span>}</td>
                      <td className="num">{a.count}</td>
                      <td>{dateTime(a.first_at)}</td>
                      <td>{dateTime(a.last_at)}</td>
                      <td className={a.resolved_at ? undefined : "muted"}>{a.resolved_at ? `${shortDate(a.resolved_at)}${a.resolved_by_name ? ` · ${a.resolved_by_name}` : ""}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="a-tfoot">Showing 1–{alerts.length} of {alerts.length} · open first, then newest</div>
        </>
      )}
    </div>
  );
}
