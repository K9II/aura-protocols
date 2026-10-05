// What must be true before a campaign can be scheduled or sent. Pure. The
// server runs these on save and again on send (authoritative).
import { findViolations } from "../../../../scripts/compliance-scan.mjs";
import type { CodeStatus } from "@/lib/discounts/rules";
import { shortDate } from "@/lib/discounts/time";
import type { CampaignKind } from "@/lib/email/campaigns/rules";

export type Check = { level: "block" | "warn" | "ok"; field?: string; text: string };
export type CheckFields = { subject: string; previewText: string; headline: string; body: string; buttonLabel: string; buttonPath: string };
export type LotFacts = { lot: string; waiting: boolean };
export type CodeFacts = { code: string; status: CodeStatus; startsAt: string | null; endsAt: string | null; maxUses: number | null; uses: number };

const FIELD_LABEL: Record<keyof Omit<CheckFields, "buttonPath">, string> = {
  subject: "Subject", previewText: "Preview text", headline: "Headline", body: "Body", buttonLabel: "Button",
};

export function campaignChecks(i: { kind: CampaignKind; fields: CheckFields; lots: LotFacts[]; code: CodeFacts | null; recipients: number }, sendAtMs: number): Check[] {
  const out: Check[] = [];
  let banned = false;
  for (const [field, label] of Object.entries(FIELD_LABEL) as Array<[keyof typeof FIELD_LABEL, string]>) {
    for (const h of findViolations(i.fields[field].replace(/\*/g, "")) as { rule: string }[]) {
      banned = true;
      out.push({ level: "block", field, text: `${label}: "${h.rule}" is a banned phrase. Fix it to send.` });
    }
  }
  if (!banned) out.push({ level: "ok", text: "Compliance scan passed: subject, headline, body and button." });

  if (i.kind === "new_lots") {
    const gone = i.lots.filter((l) => !l.waiting);
    for (const l of gone) out.push({ level: "block", field: "lots", text: `${l.lot} isn't waiting to announce any more (sold out, hidden, or already announced). Untick it.` });
    if (!gone.length && i.lots.length) out.push({ level: "ok", text: "Every lot is still live and certified." });
  }

  if (i.kind === "promotion") {
    const c = i.code;
    if (!c) out.push({ level: "block", field: "discountCodeId", text: "The linked code no longer exists. Pick another." });
    else if (c.status === "ended") out.push({ level: "block", field: "discountCodeId", text: `${c.code} has ended. Pick another code.` });
    else if (c.status === "used_up") out.push({ level: "block", field: "discountCodeId", text: `${c.code} is used up. Raise its limit in Discounts or pick another code.` });
    else if (c.status === "paused") out.push({ level: "block", field: "discountCodeId", text: `${c.code} is paused. Resume it in Discounts first.` });
    else {
      if (c.startsAt && Date.parse(c.startsAt) > sendAtMs) {
        const d = shortDate(c.startsAt);
        out.push({ level: "warn", field: "discountCodeId", text: `${c.code} starts ${d}. Sending before then means the code won't work yet: schedule for ${d} or later.` });
      }
      if (c.maxUses != null && c.maxUses - c.uses < i.recipients) {
        out.push({ level: "warn", field: "discountCodeId", text: `${c.code} has ${(c.maxUses - c.uses).toLocaleString("en-US")} uses left and ${i.recipients.toLocaleString("en-US")} people will get this. Once it's used up, the code stops working at checkout. Raise the limit in Discounts if you want everyone to be able to use it.` });
      }
    }
  }

  if (i.fields.buttonPath) out.push({ level: "ok", text: "Button link is on auraprotocols.com." });
  return out;
}

export const isBlocked = (checks: Check[]): boolean => checks.some((c) => c.level === "block");
