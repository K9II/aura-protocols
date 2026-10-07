// One line of Admin → Activity: the module's own wording (shared with its
// page), with what it was about (order, customer, code, product).
import type { ActivityItem } from "@/lib/audit/feed";
import { customerEventText } from "@/components/admin/customers/eventText";
import { catalogEventLine } from "@/components/admin/catalog/eventLine";
import { eventText as discountEventText } from "@/components/admin/discounts/ActivityCard";
import { emailEventText } from "@/lib/email/admin-event-text";
import { AUTOMATION_LABEL, type Automation } from "@/lib/email/admin-data";
import { eventText as disputeEventText } from "@/lib/disputes/rules";

const strength = (v: string | null) => (v ? v.replace(/^(\d+(?:\.\d+)?)([a-z]+)$/i, "$1 $2") : "");
const about = (s: string | null | undefined) => (s ? <span className="muted"> · {s}</span> : null);

export default function ActivityLine({ i }: { i: ActivityItem }): React.ReactNode {
  const who = i.actorName.split(" ")[0];
  switch (i.source) {
    case "admin": {
      const { action, label, detail } = i.e;
      const d = detail ? ` · ${detail}` : "";
      switch (action) {
        case "order_shipped": return <>{who} marked <b>{label}</b> shipped{d}</>;
        case "order_refunded": return <>{who} <b>refunded</b> {label}{d}</>;
        // detail: "Replacement · $192.00 retail · email: yes" — the email flag feeds the order timeline only.
        case "no_charge_created": return <>{who} <b>created</b> no-charge order {label}{detail ? ` · ${detail.replace(/ · email: (yes|no)$/, "")}` : ""}</>;
        case "no_charge_cancelled": return <>{who} <b>cancelled</b> no-charge order {label}</>;
        case "partner_approved": return <>{who} <b>approved</b> partner {label}</>;
        case "partner_declined": return <>{who} <b>declined</b> partner {label}</>;
        case "partner_suspended": return <>{who} <b>suspended</b> partner {label}</>;
        case "partner_reinstated": return <>{who} <b>reinstated</b> partner {label}</>;
        case "payout_paid": return <>{who} marked the {label} payout <b>paid</b>{d}</>;
        case "w9_opened": return <>{who} <b>opened</b> {label}&apos;s W-9</>;
        case "w9_checked": return <>{who} marked {label}&apos;s W-9 checked</>;
        case "inquiries_seen": return <>{who} marked inquiries seen</>;
        case "staff_disabled": return <>{who} <b>disabled</b> {label ?? "a team login"}{d}</>;
        case "staff_enabled": return <>{who} <b>enabled</b> {label ?? "a team login"}</>;
        case "staff_signed_out": return <>{who} signed {label ?? "a team login"} out everywhere{d}</>;
      }
      return action;
    }
    case "customer": return <>{customerEventText({ ...i.e, actorName: who })}{about(i.customerName)}</>;
    case "catalog": return <>{catalogEventLine({ ...i.e, actorName: who }, strength)}{about(i.productName)}</>;
    case "discount": return <>{who} · {discountEventText(i.e)}{about(i.codeLabel)}</>;
    case "email": {
      const e = i.e;
      if (e.action === "paused" || e.action === "resumed") {
        return <>{who} {e.action} <b>{AUTOMATION_LABEL[e.target as Automation] ?? e.target}</b>{about(e.note)}</>;
      }
      return <>{emailEventText({ ...e, actorName: who })}{about(i.campaignName)}</>;
    }
    case "inquiry": {
      const { action, detail } = i.e;
      const on = i.label ? <> {i.label}</> : null;
      switch (action) {
        case "replied": return <>{who} replied to{on}{about(detail)}</>;
        case "draft_saved": return <>{who} saved a reply draft on{on}</>;
        case "draft_discarded": return <>{who} discarded the reply draft on{on}</>;
        case "closed": return <>{who} <b>closed</b>{on}</>;
        case "reopened": return <>{who} <b>re-opened</b>{on}</>;
        case "topic_changed": return <>{who} changed the topic of{on} to <b>{detail}</b></>;
        case "linked": return <>{who} linked{on} to the account {detail}</>;
        case "unlinked": return <>{who} unlinked the account from{on}</>;
        case "unmatched_attached": return <>{who} attached an unmatched email to{on}</>;
        case "unmatched_dismissed": return <>{who} dismissed an unmatched email{about(detail)}</>;
        case "reply_saved": return <>{who} saved the reply <b>{detail}</b></>;
        case "reply_deleted": return <>{who} deleted the reply <b>{detail}</b></>;
      }
      return <>{who} · {action}{on}</>;
    }
    case "dispute": return <>{disputeEventText({ ...i.e, actorName: who }).text}{about(i.orderNumber)}</>;
    case "alert": return <>{who} marked alert <b>{i.e.title}</b> done{about(i.e.note ? `“${i.e.note}”` : null)}</>;
  }
}
