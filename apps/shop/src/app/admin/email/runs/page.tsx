import type { Metadata } from "next";
import { requireOwner } from "@/lib/dal";
import { listRuns } from "@/lib/email/admin-data";
import { RUNS_SHOWN } from "@/lib/email/constants";
import { dateTime } from "@/lib/discounts/time";
import { Crumbs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Email run history", robots: { index: false, follow: false } };

export default async function EmailRunsPage() {
  await requireOwner();
  const runs = await listRuns(RUNS_SHOWN);
  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Email", href: "/admin/email" }, { label: "Run history" }]} />
      <div className="a-ph"><div><h1>Hourly email run</h1><p>The last {RUNS_SHOWN} runs. Each one sends welcome files, cart reminders and campaigns that are due.</p></div></div>
      {runs.length === 0 ? <div className="a-empty">No runs recorded yet.</div> : (
        <div className="a-runscroll"><table className="a-t">
          <thead><tr><th>Started</th><th className="num">Welcome</th><th className="num">Cart</th><th className="num">Skipped</th><th className="num">Campaign</th><th className="num">Failures</th><th>Details</th></tr></thead>
          <tbody>{runs.map((r) => (
            <tr key={r.id}>
              <td>{dateTime(r.started_at)}{!r.finished_at && <span className="a-chip red" style={{ marginLeft: 6 }}>Didn&apos;t finish</span>}</td>
              <td className="num">{r.welcome_sent}</td><td className="num">{r.cart_sent}</td><td className="num">{r.cart_skipped}</td><td className="num">{r.campaign_sent}</td>
              <td className={`num${r.failures ? "" : " muted"}`}>{r.failures}</td>
              <td>{r.error_text ? <details><summary>Show</summary><pre className="a-pre">{r.error_text}</pre></details> : <span className="muted">—</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
