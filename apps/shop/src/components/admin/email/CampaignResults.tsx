import { recipientCounts, codeForCampaign, type CampaignRow } from "@/lib/email/campaigns/data";
import { attribution, sendStats } from "@/lib/email/stats";
import { statKey } from "@/lib/email/stat-keys";
import { listAdminEvents, type EmailAdminEvent } from "@/lib/email/admin-data";
import { AUDIENCE_LABEL, CAMPAIGN_STATUS_LABEL, KIND_LABEL } from "@/lib/email/campaigns/rules";
import { ATTRIBUTION_DAYS, MAX_SEND_ATTEMPTS } from "@/lib/email/constants";
import { fmtPct, pct } from "@/lib/email/health";
import { dateTime } from "@/lib/discounts/time";
import { siteUrl } from "@/lib/supabase/env";
import { copyAction } from "@/app/admin/email/actions";
import { Crumbs, Icon, money } from "@/components/admin/ui";
import EmailPreview from "@/components/admin/email/EmailPreview";
import StopDialog from "@/components/admin/email/StopDialog";
import SendingRefresh from "@/components/admin/email/SendingRefresh";

const n = (x: number) => x.toLocaleString("en-US");
const CHIP = { sending: "sending", sent: "sent", stopped: "stopped" } as const;

function eventText(e: EmailAdminEvent): string {
  const who = e.actorName ? ` by ${e.actorName.split(" ")[0]}` : "";
  switch (e.action) {
    case "created": return `Draft created${who}`;
    case "copied": return `Copied from another campaign${who}`;
    case "test_sent": return `Test sent to ${e.note}`;
    case "scheduled": return `Scheduled for ${e.note ? dateTime(e.note) : "—"}${who}`;
    case "unscheduled": return `Unscheduled${who}`;
    case "send_started": return `Sending started${e.actorName ? who : " by the hourly run"} · ${e.note}`;
    case "stopped": return `Stopped${who}`;
    case "finished": return "Finished";
    default: return e.action;
  }
}

export default async function CampaignResults({ c, sendError }: { c: CampaignRow; sendError?: string | null }) {
  const since = c.started_at ?? c.created_at;
  const [counts, stats, attr, events, code] = await Promise.all([
    recipientCounts(c.id), sendStats(since), attribution(since), listAdminEvents(c.id),
    c.kind === "promotion" ? codeForCampaign(c.discount_code_id) : Promise.resolve(null),
  ]);
  const s = stats.get(statKey("campaign", c.id)) ?? { sent: 0, bounced: 0, complaints: 0, unsubscribed: 0 };
  const a = attr.get(statKey("campaign", c.id)) ?? { orders: 0, revenueCents: 0 };
  const status = c.status as "sending" | "sent" | "stopped";
  const handled = counts.sent + counts.skipped + counts.failed;
  return (
    <div className="a-page">
      {status === "sending" && <SendingRefresh />}
      <Crumbs items={[{ label: "Email", href: "/admin/email" }, { label: c.name }]} />
      {sendError && <div className="a-callout warn" role="alert" style={{ marginBottom: 16 }}><Icon name="warn" /><span>{sendError}</span></div>}
      <div className="a-ph">
        <div><h1>{c.name} <span className={`a-chip ${CHIP[status]}`}>{CAMPAIGN_STATUS_LABEL[status]}</span></h1>
          <p>{KIND_LABEL[c.kind]} · {AUDIENCE_LABEL[c.audience]} · started {c.started_at ? dateTime(c.started_at) : "—"}{c.finished_at ? ` · ${status === "stopped" ? "stopped" : "finished"} ${dateTime(c.finished_at)}` : ""}</p></div>
        <div className="actions">
          {status === "sending" && <StopDialog id={c.id} done={counts.sent} total={c.recipients} />}
          {status !== "sending" && <form action={copyAction}><input type="hidden" name="id" value={c.id} /><button type="submit" className="a-btn"><Icon name="copy" />Copy as new draft</button></form>}
        </div>
      </div>

      {status === "sending" && (
        <div className="a-prog">
          <div className="row1"><b>{n(handled)} of {n(c.recipients)} handled</b><span className="muted">{c.recipients ? Math.round((handled / c.recipients) * 100) : 0}%</span><span className="r muted">{counts.pending ? `The other ${n(counts.pending)} go out on the next hourly run if this one doesn't finish them.` : "Finishing…"}</span></div>
          <div className="a-big-meter"><i style={{ width: `${c.recipients ? (handled / c.recipients) * 100 : 0}%` }} /></div>
          <div className="muted" style={{ fontSize: 12 }}>{n(counts.sent)} sent · {n(counts.failed)} failed · {n(counts.skipped)} skipped (unsubscribed after the list was set)</div>
        </div>
      )}

      <div className="a-kpis" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        <div className="a-kpi"><div className="l">Recipients</div><div className="v">{n(c.recipients)}</div></div>
        <div className="a-kpi"><div className="l">Sent</div><div className="v">{n(counts.sent)}</div>{counts.failed > 0 && <div className="d">{n(counts.failed)} failed</div>}</div>
        <div className="a-kpi"><div className="l">Bounced</div><div className="v">{n(s.bounced)}</div><div className="d">{fmtPct(pct(s.bounced, counts.sent))}</div></div>
        <div className="a-kpi"><div className="l">Complaints</div><div className="v">{n(s.complaints)}</div><div className="d">{fmtPct(pct(s.complaints, counts.sent))}</div></div>
        <div className="a-kpi"><div className="l">Unsubscribed</div><div className="v">{n(s.unsubscribed)}</div><div className="d">{fmtPct(pct(s.unsubscribed, counts.sent))}</div></div>
        <div className="a-kpi hl"><div className="l">Orders after</div><div className="v">{n(a.orders)}</div><div className="d">within {ATTRIBUTION_DAYS} days</div></div>
        <div className="a-kpi hl"><div className="l">Revenue after</div><div className="v">{money(a.revenueCents)}</div><div className="d">goods, after discounts</div></div>
      </div>

      <div className="a-grid-d">
        <EmailPreview input={{ kind: c.kind, subject: c.subject, previewText: c.preview_text, content: c.content, lots: c.lots_snapshot, code: code?.render ?? null }} site={siteUrl()} mailingAddress={process.env.MAILING_ADDRESS ?? "[mailing address]"} />
        <div className="a-rail">
          <div className="a-card"><div className="a-card-h"><h3>How orders are counted</h3></div><div className="a-card-b" style={{ fontSize: 12.5, lineHeight: 1.55 }}>A paid order counts if the customer was sent this email in the {ATTRIBUTION_DAYS} days before. If two campaigns qualify, the more recent one gets it. Refunds are taken off. These are orders <i>after</i> the email, not proof the email caused them. A send that fails is retried on the next hourly runs, up to {MAX_SEND_ATTEMPTS} tries.</div></div>
          <div className="a-card"><div className="a-card-h"><h3>Activity</h3></div><div className="a-card-b"><ul className="a-log">{events.map((e) => <li key={e.id}><span>{eventText(e)}<small>{dateTime(e.at)}</small></span></li>)}</ul></div></div>
        </div>
      </div>
    </div>
  );
}
