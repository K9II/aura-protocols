// One line of an email Activity card (campaign results and Admin → Activity).
import type { EmailAdminEvent } from "@/lib/email/admin-data";
import { dateTime } from "@/lib/discounts/time";

export function emailEventText(e: EmailAdminEvent): string {
  const who = e.actorName ? ` by ${e.actorName.split(" ")[0]}` : "";
  switch (e.action) {
    case "created": return `Draft created${who}`;
    case "copied": return `Copied from another campaign${who}`;
    case "test_sent": return `Test sent to ${e.note}${who}`;
    case "edited": return `Draft edited${who}`;
    case "scheduled": return `Scheduled for ${e.note ? dateTime(e.note) : "—"}${who}`;
    case "unscheduled": return `Unscheduled${who}`;
    case "send_started": return `Sending started${e.actorName ? who : " by the hourly run"} · ${e.note}`;
    case "stopped": return `Stopped${who}`;
    case "finished": return "Finished";
    default: return e.action;
  }
}
