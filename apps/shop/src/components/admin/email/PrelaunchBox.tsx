// Email → Pre-launch (2026-10-23): the waitlist emails in their order. #1 sends itself on
// joining; #2–#4 are ready-made campaigns sent once each from here. #3 also has the Early
// access switch (sending #3 turns it on). Server component — Open posts to setUpPrelaunchAction.
import { setUpPrelaunchAction } from "@/app/admin/email/actions";
import { AUDIENCE_LABEL, CAMPAIGN_STATUS_LABEL, PRELAUNCH, type Audience, type PrelaunchKind } from "@/lib/email/campaigns/rules";
import type { CampaignRow } from "@/lib/email/campaigns/data";
import { shortDate } from "@/lib/discounts/time";
import { Icon } from "@/components/admin/ui";
import EarlySwitch from "@/components/admin/email/EarlySwitch";

// earlyOpen: the Early access switch; null when it couldn't be read.
type Props = { rows: Partial<Record<PrelaunchKind, CampaignRow>>; counts: Record<Audience, number>; canDraft: boolean; canSend?: boolean; earlyOpen?: boolean | null };

const n = (x: number) => x.toLocaleString("en-US");

function state(c: CampaignRow | undefined): string {
  if (!c) return "Not opened yet";
  if (c.status === "sent") return `Sent ${c.finished_at ? shortDate(c.finished_at) : ""} · ${n(c.recipients)} people`.replace("  ", " ");
  if (c.status === "sending") return `Sending · ${n(c.recipients)} people`;
  return CAMPAIGN_STATUS_LABEL[c.status];
}

function Row({ kind, c, counts, canDraft }: { kind: PrelaunchKind; c: CampaignRow | undefined; counts: Props["counts"]; canDraft: boolean }) {
  const p = PRELAUNCH[kind];
  return (
    <div className="a-pre-row">
      <span className="num">{p.step}</span>
      <div className="t"><b>{p.subject}</b><small>{p.when} To: {AUDIENCE_LABEL[p.audience]} ({n(counts[p.audience])})</small></div>
      <span className={`a-chip ${c?.status === "sent" ? "sent" : c?.status === "sending" ? "on" : "draft"}`}>{state(c)}</span>
      {c && c.status !== "draft" ? <a className="a-btn" href={`/admin/email/campaigns/${c.id}`}>Results</a>
        : canDraft ? <form action={setUpPrelaunchAction}><input type="hidden" name="kind" value={kind} /><button type="submit" className="a-btn primary"><Icon name="send" />Open</button></form>
        : null}
    </div>
  );
}

export default function PrelaunchBox({ rows, counts, canDraft, canSend = false, earlyOpen = null }: Props) {
  return (
    <section className="a-pre" aria-labelledby="pre-h">
      <div className="a-sec-h"><h3 id="pre-h">Pre-launch</h3><span>the waitlist emails, in order · each goes once</span></div>
      <div className="a-pre-row">
        <span className="num">1</span>
        <div className="t"><b>You&apos;re on the list</b><small>Sends itself the moment someone joins the waitlist.</small></div>
        <span className="a-chip on">On</span>
      </div>
      <Row kind="first_look" c={rows.first_look} counts={counts} canDraft={canDraft} />
      <Row kind="early_access" c={rows.early_access} counts={counts} canDraft={canDraft} />
      <div className="a-pre-row sub">
        <span className="num" aria-hidden />
        <div className="t"><b>Early access</b><small>Lets a browser that opened an early link past the coming-soon page. Sending email 3 turns it on.</small></div>
        {earlyOpen === null ? <span className="a-chip paused">Couldn&apos;t load</span> : <>
          <span className={`a-chip ${earlyOpen ? "on" : "draft"}`}>{earlyOpen ? "On" : "Off"}</span>
          {canSend && <EarlySwitch open={earlyOpen} />}
        </>}
      </div>
      <Row kind="we_are_open" c={rows.we_are_open} counts={counts} canDraft={canDraft} />
    </section>
  );
}
