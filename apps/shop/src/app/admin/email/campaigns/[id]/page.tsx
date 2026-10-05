import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { getCampaign, lotChoices } from "@/lib/email/campaigns/data";
import { audienceCounts } from "@/lib/email/stats";
import { listAdminEvents } from "@/lib/email/admin-data";
import { AUDIENCE_LABEL, CAMPAIGN_STATUS_LABEL, currentMs, KIND_LABEL, nextHourMs } from "@/lib/email/campaigns/rules";
import { promotionCodes } from "@/app/admin/email/campaigns/codes";
import { unscheduleAction } from "@/app/admin/email/actions";
import { checksFor } from "@/lib/email/campaigns/checks-server";
import { dateTime, isoToZonedLocal } from "@/lib/discounts/time";
import { siteUrl } from "@/lib/supabase/env";
import { Crumbs, Icon } from "@/components/admin/ui";
import CampaignEditor from "@/components/admin/email/CampaignEditor";
import EmailPreview from "@/components/admin/email/EmailPreview";
import CampaignResults from "@/components/admin/email/CampaignResults";

export const metadata: Metadata = { title: "Campaign", robots: { index: false, follow: false } };
// Send now runs a batch inside the server action invoked from this page.
export const maxDuration = 300;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const c = await getCampaign(id.data);
  if (!c) notFound();
  if (c.status === "sending" || c.status === "sent" || c.status === "stopped") return <CampaignResults c={c} />;

  const [lots, counts, codes, events] = await Promise.all([
    c.kind === "new_lots" ? lotChoices(c.id) : Promise.resolve([]), audienceCounts(), promotionCodes(c.discount_code_id), listAdminEvents(c.id),
  ]);
  const checks = await checksFor(c, c.scheduled_for ? Date.parse(c.scheduled_for) : currentMs());
  const lastTest = events.find((e) => e.action === "test_sent");
  const site = siteUrl(), mailingAddress = process.env.MAILING_ADDRESS ?? "[mailing address]";
  const head = (
    <>
      <Crumbs items={[{ label: "Email", href: "/admin/email" }, { label: c.name }]} />
      <div className="a-ph"><div><h1>{c.name} <span className={`a-chip ${c.status === "draft" ? "draft" : "sched"}`}>{CAMPAIGN_STATUS_LABEL[c.status]}</span></h1>
        <p>{KIND_LABEL[c.kind]} · {AUDIENCE_LABEL[c.audience]}{c.status === "draft" ? ` · saved ${dateTime(c.updated_at)} · nothing is sent until you press Send now or Schedule.` : ""}</p></div></div>
    </>
  );

  if (c.status === "scheduled") {
    return (
      <div className="a-page" style={{ maxWidth: 1200 }}>
        {head}
        <div className="a-callout info" style={{ marginBottom: 16 }}><Icon name="clock" /><span>Scheduled for {dateTime(c.scheduled_for!)} (Mountain). The hourly email run sends it then. To change anything, unschedule it first.</span>
          <form action={unscheduleAction} style={{ marginLeft: "auto" }}><input type="hidden" name="id" value={c.id} /><button type="submit" className="a-btn sm">Unschedule</button></form></div>
        {checks.some((x) => x.level !== "ok") && <div className="a-checks" style={{ marginBottom: 16 }}>{checks.filter((x) => x.level !== "ok").map((x, i) => <div key={i} className={`ck ${x.level === "block" ? "bad" : x.level}`}><Icon name="warn" /><span>{x.text}</span></div>)}</div>}
        <EmailPreview input={{ kind: c.kind, subject: c.subject, previewText: c.preview_text, content: c.content, lots: c.lots_snapshot, code: c.discount_code_id ? codes.render[c.discount_code_id] ?? null : null }} site={site} mailingAddress={mailingAddress} />
      </div>
    );
  }

  return (
    <div className="a-page" style={{ maxWidth: 1200 }}>
      {head}
      <CampaignEditor campaign={c} kind={c.kind} lotChoices={lots} codes={codes.options} codeRender={codes.render} audienceCounts={counts} checks={checks}
        site={site} mailingAddress={mailingAddress} lastTest={lastTest ? `${dateTime(lastTest.at)} to ${lastTest.note}` : null}
        defaultScheduleLocal={isoToZonedLocal(new Date(nextHourMs(currentMs())).toISOString())} />
    </div>
  );
}
