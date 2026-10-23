import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { currentMs } from "@/lib/clock";
import { shortDate } from "@/lib/discounts/time";
import { listWaitlist } from "@/lib/waitlist/admin-data";
import {
  STATUS_LABEL, WAITLIST_PAGE_SIZE, WAITLIST_WEEK_DAYS, cleanWaitlistSearch, searchWaitlist, topReferrers, waitlistCounts,
  type WaitlistRow,
} from "@/lib/waitlist/admin";
import { Crumbs, Icon, Kpis } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Waitlist", robots: { index: false, follow: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const n = (x: number) => x.toLocaleString("en-US");
const CHIP: Record<WaitlistRow["status"], string> = { confirmed: "ver", pending: "unver", unsubscribed: "released" };

function Status({ r }: { r: WaitlistRow }) {
  return <span className="a-chips"><span className={`a-chip ${CHIP[r.status]}`}>{STATUS_LABEL[r.status]}</span></span>;
}

// Read-only (spec: 2026-10-23 waitlist admin handoff). Search and paging work
// on the whole list in memory — referrer emails and colleague counts need it.
export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
  await requirePermission("waitlist.view");
  const sp = await searchParams;
  const qRaw = first(sp.q) ?? "";
  const q = cleanWaitlistSearch(qRaw);
  const pageRaw = Number(first(sp.page));
  const all = await listWaitlist();
  const c = waitlistCounts(all, currentMs());
  const top = topReferrers(all);
  const found = searchWaitlist(all, q);
  const lastPage = Math.max(1, Math.ceil(found.length / WAITLIST_PAGE_SIZE));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.min(Math.trunc(pageRaw), lastPage) : 1;
  const rows = found.slice((page - 1) * WAITLIST_PAGE_SIZE, page * WAITLIST_PAGE_SIZE);
  const href = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (p > 1) s.set("page", String(p));
    const str = s.toString();
    return `/admin/waitlist${str ? `?${str}` : ""}`;
  };
  const joinedTotal = c.onList + c.unsubscribed;

  return (
    <div className="a-page a-wl">
      <Crumbs items={[{ label: "Waitlist" }]} />
      <div className="a-ph">
        <div><h1>Waitlist</h1><p>Everyone waiting for the store to open, and the colleagues they brought in.</p></div>
        <div className="actions"><a className="a-btn primary" href="/admin/waitlist/waitlist.csv" download><Icon name="download" />Download CSV</a></div>
      </div>

      <Kpis items={[
        { label: "On the waitlist", value: n(c.onList), sub: "not counting unsubscribed" },
        { label: "Joined today", value: n(c.today), sub: "shop time (Mountain)" },
        { label: `Joined · ${WAITLIST_WEEK_DAYS} days`, value: n(c.week), sub: "including today" },
        { label: "Came through an invite", value: n(c.invited), sub: joinedTotal ? `${Math.round((c.invited / joinedTotal) * 100)}% of everyone who joined` : "—" },
        { label: "Unsubscribed", value: n(c.unsubscribed), sub: "won't get waitlist email" },
      ]} />

      <div className="a-card" style={{ marginBottom: 18 }}>
        <div className="a-card-h"><h3>Top referrers</h3><span className="sub">who brought in the most colleagues · a shortlist for the partner program</span></div>
        {top.length === 0 ? <div className="a-card-b"><span className="muted">No one has brought in a colleague yet.</span></div> : (
          <table className="a-t" style={{ border: 0 }}>
            <thead><tr><th>Email</th><th>Invite code</th><th className="num">Colleagues</th></tr></thead>
            <tbody>{top.map((r) => (
              <tr key={r.email}>
                <td className="a-wl-em">{r.email}</td>
                <td className="mono">{r.code}</td>
                <td className="num">{n(r.colleagues)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <div className="a-toolbar">
        <form className="a-search" action="/admin/waitlist" role="search" style={{ width: 300 }}>
          <Icon name="search" /><input name="q" defaultValue={qRaw} placeholder="Email or invite code" aria-label="Search the waitlist" />
        </form>
      </div>

      {rows.length === 0 ? <div className="a-empty">{q ? "Nothing matches." : "No one is on the waitlist yet."}</div> : (
        <>
          <table className="a-t a-only-desk">
            <thead><tr><th>Email</th><th>Joined</th><th>Came through</th><th>Invite link</th><th className="num">Colleagues</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.email}>
                <td className="a-wl-em">{r.email}</td>
                <td>{shortDate(r.joinedAt)}</td>
                <td className="a-wl-em">{r.referrerEmail ?? <span className="muted">—</span>}</td>
                <td className="mono">{r.inviteLabel ?? <span className="muted">—</span>}</td>
                <td className={`num${r.colleagues ? "" : " muted"}`}>{r.colleagues}</td>
                <td><Status r={r} /></td>
              </tr>
            ))}</tbody>
          </table>
          <div className="a-plist a-only-phone">{rows.map((r) => (
            <div key={r.email} className="a-pcust">
              <b className="a-wl-em">{r.email}</b><Status r={r} />
              {r.inviteLabel && <span className="em">{r.inviteLabel}</span>}
              <div className="meta">
                <span>Joined {shortDate(r.joinedAt)}</span>
                <span><b>{r.colleagues}</b> colleague{r.colleagues === 1 ? "" : "s"}</span>
                {r.referrerEmail && <span>via {r.referrerEmail}</span>}
              </div>
            </div>
          ))}</div>
          <div className="a-tfoot">
            Showing {(page - 1) * WAITLIST_PAGE_SIZE + 1}–{Math.min(page * WAITLIST_PAGE_SIZE, found.length)} of {n(found.length)} · newest first
            <div className="r">
              {page > 1 && <Link className="a-btn sm" href={href(page - 1)}>Previous</Link>}
              {page < lastPage && <Link className="a-btn sm" href={href(page + 1)}>Next</Link>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
