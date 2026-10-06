// Campaign rules: kinds, statuses and the status machine, audiences, form
// parsing, scheduling and the drafts Announce / New campaign start from.
// Pure — safe on client and server.
import { MAX_SCHEDULE_DAYS } from "@/lib/email/constants";
import { shortDate } from "@/lib/discounts/time";
import type { AlertLot } from "@/lib/emails-marketing";

export const CAMPAIGN_KINDS = ["new_lots", "promotion", "news"] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];
export const KIND_LABEL: Record<CampaignKind, string> = { new_lots: "New lots", promotion: "Promotion", news: "Research news" };
export const KIND_HELP: Record<CampaignKind, string> = {
  new_lots: "Certified lots, filled in from Catalog", promotion: "Links a code from Discounts", news: "An article or update, no offer",
};
export const parseKind = (v: string | undefined): CampaignKind => ((CAMPAIGN_KINDS as readonly string[]).includes(v ?? "") ? (v as CampaignKind) : "news");

export const CAMPAIGN_STATUSES = ["draft", "scheduled", "sending", "sent", "stopped"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = { draft: "Draft", scheduled: "Scheduled", sending: "Sending", sent: "Sent", stopped: "Stopped" };

// The only moves a campaign may make. Enforced by lib/email/campaigns/data.ts
// (and admin_start_campaign for → sending) — nothing else writes `status`.
const ALLOWED: Record<CampaignStatus, readonly CampaignStatus[]> = {
  draft: ["scheduled", "sending"],
  scheduled: ["draft", "sending"],
  sending: ["sent", "stopped"],
  sent: [],
  stopped: [],
};
export const canMove = (from: CampaignStatus, to: CampaignStatus): boolean => ALLOWED[from].includes(to);
export const isEditable = (s: CampaignStatus): boolean => s === "draft";

export const AUDIENCES = ["all", "ordered", "never_ordered"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const AUDIENCE_LABEL: Record<Audience, string> = { all: "Everyone", ordered: "Has ordered", never_ordered: "Never ordered" };

export type CampaignContent = { headline: string; body: string; buttonLabel: string; buttonPath: string };
export type CampaignFields = {
  name: string; subject: string; previewText: string; audience: Audience;
  content: CampaignContent; discountCodeId: string | null; lots: string[];
};

export const LIMITS = { name: 120, subject: 150, previewText: 150, headline: 120, body: 5000, buttonLabel: 40, buttonPath: 300 } as const;
const PATH_RE = /^\/(?!\/)[A-Za-z0-9\-._~/?=&%#]*$/;
export const isSitePath = (p: string): boolean => PATH_RE.test(p);

export function parseCampaignForm(
  kind: CampaignKind, f: Record<string, string>, lots: string[],
): { ok: true; value: CampaignFields } | { ok: false; fieldErrors: Record<string, string> } {
  const t = (k: string) => (f[k] ?? "").trim();
  const errs: Record<string, string> = {};
  const name = t("name"), subject = t("subject"), previewText = t("previewText"), headline = t("headline");
  const body = (f.body ?? "").replace(/\r\n/g, "\n").trim();
  const buttonLabel = t("buttonLabel"), buttonPath = t("buttonPath"), audience = t("audience");
  if (!name) errs.name = "Give it a name (only you see it).";
  if (!subject) errs.subject = "Write a subject line.";
  if (!headline) errs.headline = "Write a headline.";
  const values = { name, subject, previewText, headline, body, buttonLabel, buttonPath };
  for (const [k, v] of Object.entries(values)) {
    const max = LIMITS[k as keyof typeof LIMITS];
    if (v.length > max && !errs[k]) errs[k] = `Keep it under ${max} characters.`;
  }
  if (buttonPath && !isSitePath(buttonPath)) errs.buttonPath = "Use a path on auraprotocols.com, like /products.";
  else if (buttonLabel && !buttonPath) errs.buttonPath = "Add the page the button opens.";
  if (buttonPath && !buttonLabel) errs.buttonLabel = "Add the button text.";
  if (!(AUDIENCES as readonly string[]).includes(audience)) errs.audience = "Pick an audience.";
  const discountCodeId = kind === "promotion" ? t("discountCodeId") || null : null;
  if (kind === "promotion" && !discountCodeId) errs.discountCodeId = "Pick a code from Discounts.";
  if (kind === "new_lots" && lots.length === 0) errs.lots = "Tick at least one lot.";
  if (Object.keys(errs).length) return { ok: false, fieldErrors: errs };
  return {
    ok: true,
    value: {
      name, subject, previewText, audience: audience as Audience, discountCodeId,
      lots: kind === "new_lots" ? lots : [],
      content: { headline, body, buttonLabel, buttonPath },
    },
  };
}

// Blank line = new paragraph; single line breaks inside a paragraph are joined.
export function paragraphs(body: string): string[] {
  return body.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
}

// The red label above the headline.
export function kicker(kind: CampaignKind, codeEndsAt: string | null): string {
  if (kind === "new_lots") return "New lot · Certified";
  if (kind === "news") return "Research news";
  return codeEndsAt ? `Promotion · Through ${shortDate(codeEndsAt)}` : "Promotion";
}

const HOUR = 3_600_000;
export const nextHourMs = (nowMs: number): number => Math.floor(nowMs / HOUR) * HOUR + HOUR;
// Moved to lib/clock.ts (Today uses it too); re-exported so Email pages keep working.
export { currentMs } from "@/lib/clock";

export function scheduleError(iso: string, nowMs: number = Date.now()): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "Pick a date and time.";
  if (ms % HOUR !== 0) return "Pick a time on the hour.";
  if (ms < nextHourMs(nowMs)) return "Pick the next hour or later.";
  if (ms > nowMs + MAX_SCHEDULE_DAYS * 24 * HOUR) return `Pick a time in the next ${MAX_SCHEDULE_DAYS} days.`;
  return null;
}

const names = (lots: AlertLot[]) => [...new Set(lots.map((l) => l.compoundName))];
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

// Announce: a New lots draft with the waiting lots ticked and the approved
// lot-alert copy filled in. Everything stays editable.
export function announceDraft(lots: AlertLot[]): CampaignFields {
  const one = lots.length === 1;
  return {
    name: `New lots: ${names(lots).join(", ")}`,
    subject: one ? `Certified: ${lots[0].compoundName}, lot ${lots[0].lot}` : `Certified: ${lots.length} new lots`,
    previewText: one ? "The certificate is linked inside." : `${andList(names(lots))}, with their certificates.`,
    audience: "all", discountCodeId: null, lots: lots.map((l) => l.lot),
    content: { headline: one ? `Lot ${lots[0].lot} is *in.*` : `${lots.length} new lots are *in.*`, body: "", buttonLabel: "", buttonPath: "" },
  };
}

export function blankDraft(kind: CampaignKind): CampaignFields {
  void kind;
  return { name: "", subject: "", previewText: "", audience: "all", discountCodeId: null, lots: [], content: { headline: "", body: "", buttonLabel: "", buttonPath: "" } };
}
