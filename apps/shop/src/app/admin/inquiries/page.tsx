import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { currentMs } from "@/lib/clock";
import { inquiryTabCounts, listInquiries, listUnmatched, type UnmatchedRow } from "@/lib/inquiries/data";
import { INQUIRIES_PER_PAGE, INQUIRY_AUTO_CLOSE_DAYS } from "@/lib/inquiries/constants";
import { STATUS_CHIP, TABS, TAB_LABEL, businessDayText, firstName, parseTab, refLabel, waitInfo, type InquiryRow, type Tab } from "@/lib/inquiries/rules";
import { TOPICS, TOPIC_LABEL, TOPIC_TAG, parseTopic, type Topic } from "@/lib/inquiries/topics";
import { unmatchedReason } from "@/lib/inquiries/match";
import { whenText } from "@/lib/today/time";
import { Crumbs, Icon, Tabs } from "@/components/admin/ui";
import { dismissUnmatchedAction } from "@/app/admin/inquiries/actions";
import AttachDialog from "@/components/admin/inquiries/AttachDialog";

export const metadata: Metadata = { title: "Inquiries", robots: { index: false, follow: false } };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const fromName = (r: InquiryRow) => (r.topic === "wholesale" && r.organization ? r.organization : r.name);
function preview(r: InquiryRow): React.ReactNode {
  const who = r.last_from === "owner" ? "You: " : r.message_count > 1 ? `${firstName(r.name)}: ` : "";
  return <>{who && <span className="who">{who}</span>}{r.last_preview ?? ""}</>;
}

function Unmatched({ open, spam, domain, nowMs }: { open: UnmatchedRow[]; spam: UnmatchedRow[]; domain: string; nowMs: number }) {
  const row = (u: UnmatchedRow, i: number) => (
    <tr key={u.id}>
      <td className="a-from"><b>{u.from_name || u.from_email}</b><span className="em2">{u.from_email}</span></td>
      <td><div className="a-prev" style={{ maxWidth: 520 }}><b style={{ fontWeight: 500, color: "var(--ink)" }}>{u.subject || "(no subject)"}</b> — {u.body_text}</div>
        <div className="muted" style={{ fontSize: 12 }}>{unmatchedReason(u, domain)}</div></td>
      <td className="muted">{whenText(u.created_at, nowMs)}</td>
      <td className="num" style={{ whiteSpace: "nowrap" }}>
        <form action={dismissUnmatchedAction} style={{ display: "inline" }}><input type="hidden" name="id" value={u.id} /><button type="submit" className="a-btn sm">Dismiss</button></form>{" "}
        <AttachDialog id={u.id} from={u.from_email} primary={i === 0} />
      </td>
    </tr>
  );
  return (
    <>
      {open.length === 0 ? <div className="a-empty">Nothing unmatched. Every email found its conversation.</div> : (
        <div className="a-scrollx"><table className="a-t">
          <thead><tr><th style={{ width: 250 }}>From</th><th>Subject</th><th>Received</th><th className="num">Action</th></tr></thead>
          <tbody>{open.map(row)}</tbody>
        </table></div>
      )}
      {spam.length > 0 && (
        <details className="a-tfoot" style={{ display: "block" }}>
          <summary>{spam.length} marked as spam by Amazon — show</summary>
          <div className="a-scrollx" style={{ marginTop: 8 }}><table className="a-t"><tbody>{spam.map((u) => row(u, 1))}</tbody></table></div>
        </details>
      )}
    </>
  );
}

// The inbox (mock screens 1 and 4). Spec 2026-10-06-admin-inquiries-design.md.
export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; topic?: string | string[]; q?: string | string[]; page?: string | string[] }> }) {
  await requireOwner();
  const sp = await searchParams;
  const tab = parseTab(first(sp.tab));
  const topic = parseTopic(first(sp.topic));
  const qRaw = first(sp.q) ?? "";
  const pageRaw = Number(first(sp.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.trunc(pageRaw) : 1;
  const nowMs = currentMs();
  const counts = await inquiryTabCounts();
  const href = (o: { tab?: Tab; topic?: Topic | null; page?: number }) => {
    const p = new URLSearchParams();
    const t = o.tab ?? tab, tp = o.topic === undefined ? topic : o.topic;
    if (t !== "open") p.set("tab", t);
    if (tp && t !== "unmatched") p.set("topic", tp);
    if (qRaw && t !== "unmatched") p.set("q", qRaw);
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const s = p.toString();
    return `/admin/inquiries${s ? `?${s}` : ""}`;
  };

  const list = tab === "unmatched" ? null : await listInquiries({ tab, topic, q: qRaw, page });
  const unmatched = tab === "unmatched" ? await listUnmatched() : null;
  const lastPage = list ? Math.max(1, Math.ceil(list.total / INQUIRIES_PER_PAGE)) : 1;
  const oldest = tab === "open" && list?.rows[0] ? waitInfo(list.rows[0], nowMs) : null;

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Inquiries" }]} />
      <div className="a-ph">
        <div><h1>Inquiries</h1><p>Messages from the contact and wholesale forms. Replies are emailed from support@auraprotocols.com; the customer&apos;s answer comes back here.</p></div>
        <div className="actions"><Link className="a-btn" href="/admin/inquiries/replies"><Icon name="edit" />Saved replies</Link></div>
      </div>

      <div className="a-toolbar a-iq-bar">
        <Tabs items={TABS.map((t) => ({ href: href({ tab: t, page: 1 }), label: TAB_LABEL[t], n: counts[t], on: t === tab }))} />
        {tab !== "unmatched" && (
          <details className="a-iq-filter">
            <summary>Topic: <b>{topic ? TOPIC_LABEL[topic] : "All"}</b><Icon name="down" /></summary>
            <div className="opts">
              <Link href={href({ topic: null, page: 1 })} className={!topic ? "on" : undefined}>All</Link>
              {TOPICS.map((t) => <Link key={t} href={href({ topic: t, page: 1 })} className={topic === t ? "on" : undefined}>{TOPIC_LABEL[t]}</Link>)}
            </div>
          </details>
        )}
        {tab !== "unmatched" && (
          <form className="a-search" action="/admin/inquiries" role="search" style={{ width: 280 }}>
            {tab !== "open" && <input type="hidden" name="tab" value={tab} />}
            {topic && <input type="hidden" name="topic" value={topic} />}
            <Icon name="search" /><input name="q" defaultValue={qRaw} placeholder="Name, email, order, Q-number…" aria-label="Search inquiries" />
          </form>
        )}
      </div>

      {unmatched && <Unmatched open={unmatched.open} spam={unmatched.spam} domain={process.env.INBOUND_MAIL_DOMAIN ?? "in.auraprotocols.com"} nowMs={nowMs} />}

      {list && (list.rows.length === 0 ? <div className="a-empty">{qRaw || topic ? "Nothing matches." : tab === "open" ? "Nothing waiting for a reply." : "Nothing here yet."}</div> : (
        <>
          <table className="a-t a-only-desk">
            <thead><tr><th style={{ width: 250 }}>From</th><th>Topic</th><th>Latest</th><th>Waiting</th><th>Status</th></tr></thead>
            <tbody>{list.rows.map((r) => {
              const w = waitInfo(r, nowMs);
              const chip = STATUS_CHIP[r.status];
              const link = `/admin/inquiries/${refLabel(r.ref)}`;
              return (
                <tr key={r.id} className={r.status === "new" ? "unread" : undefined}>
                  <td className="a-from">
                    <div className="l1"><b><Link href={link}>{fromName(r)}</Link></b>{r.customer_id && <Link className="a-chip q-cust" href={`/admin/customers/${r.customer_id}`}>Customer</Link>}</div>
                    <span className="em2">{r.email} · <span className="a-qref">{refLabel(r.ref)}</span></span>
                  </td>
                  <td><span className="a-topic">{TOPIC_TAG[r.topic]}</span></td>
                  <td><Link href={link} style={{ color: "inherit", textDecoration: "none" }}><div className="a-prev">{preview(r)}</div></Link></td>
                  <td>{w ? <span className={`a-qwait${w.late ? " red" : ""}`}>{w.text}<small>{r.status === "waiting" ? "since our reply" : `since ${whenText(w.since, nowMs)}`}</small></span> : <span className="muted">—</span>}</td>
                  <td><span className={`a-chip ${chip.tone}`}>{chip.text}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="a-plist a-only-phone">{list.rows.map((r) => {
            const w = waitInfo(r, nowMs);
            const chip = STATUS_CHIP[r.status];
            return (
              <Link key={r.id} href={`/admin/inquiries/${refLabel(r.ref)}`} className="a-pq">
                <b>{fromName(r)}</b>{w ? <span className={`a-qwait${w.late ? " red" : ""}`}>{w.text}</span> : <span />}
                <div className="pv">{r.last_preview ?? ""}</div>
                <div className="meta"><span className="a-topic">{TOPIC_TAG[r.topic]}</span><span className={`a-chip ${chip.tone}`}>{chip.text}</span><span className="a-qref">{refLabel(r.ref)}</span></div>
              </Link>
            );
          })}</div>
          <div className="a-tfoot">
            {tab === "open" ? `${counts.open} open${oldest ? ` · oldest waiting ${businessDayText(oldest.since, nowMs)}` : ""}` : `Showing ${(page - 1) * INQUIRIES_PER_PAGE + 1}–${Math.min(page * INQUIRIES_PER_PAGE, list.total)} of ${list.total.toLocaleString("en-US")}`}
            <div className="r">
              {page > 1 && <Link className="a-btn sm" href={href({ page: page - 1 })}>Previous</Link>}
              {page < lastPage && <Link className="a-btn sm" href={href({ page: page + 1 })}>Next</Link>}
              {page === 1 && lastPage === 1 && <span className="muted">Waiting on customer closes after {INQUIRY_AUTO_CLOSE_DAYS} days with no reply</span>}
            </div>
          </div>
        </>
      ))}
    </div>
  );
}
