// Inquiry rules: the status machine, list tabs, the waiting clock and the
// history wording. Pure and client-safe.
import { INQUIRY_AUTO_CLOSE_DAYS, INQUIRY_LATE_BUSINESS_DAYS } from "@/lib/inquiries/constants";
import type { Topic } from "@/lib/inquiries/topics";
import { businessDaysSince, daysBetween, localDate } from "@/lib/today/time";

export const STATUSES = ["new", "needs_reply", "waiting", "closed"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_CHIP: Record<Status, { tone: string; text: string }> = {
  new: { tone: "q-new", text: "New" },
  needs_reply: { tone: "q-needs", text: "Needs reply" },
  waiting: { tone: "q-waiting", text: "Waiting on customer" },
  closed: { tone: "q-closed", text: "Closed" },
};

// One conversation as the admin reads it (never includes the reply token).
export type InquiryRow = {
  id: string; ref: number; topic: Topic; status: Status;
  name: string; email: string; organization: string | null; order_number: string | null; customer_id: string | null;
  subject: string; created_at: string; last_activity_at: string; last_customer_at: string | null;
  waiting_since: string | null; closed_at: string | null;
  last_preview: string | null; last_from: "customer" | "owner" | null; message_count: number; file_count: number;
  draft_body: string | null; draft_by: string | null; draft_at: string | null;
};

// Every status change goes through this table (lib/inquiries/data.ts
// applyInquiryEvent). The SQL functions record_inbound_message and
// auto_close_inquiries make the "customer_replied" and "auto_close" moves.
export type InquiryEventName = "opened" | "owner_replied" | "owner_replied_close" | "customer_replied" | "close" | "reopen" | "auto_close" | "bounced";
const MOVES: Record<InquiryEventName, Partial<Record<Status, Status>>> = {
  opened: { new: "needs_reply" },
  owner_replied: { new: "waiting", needs_reply: "waiting", waiting: "waiting", closed: "waiting" },
  owner_replied_close: { new: "closed", needs_reply: "closed", waiting: "closed", closed: "closed" },
  customer_replied: { new: "new", needs_reply: "needs_reply", waiting: "needs_reply", closed: "needs_reply" },
  close: { new: "closed", needs_reply: "closed", waiting: "closed" },
  reopen: { closed: "needs_reply" },
  auto_close: { waiting: "closed" },
  bounced: { new: "new", needs_reply: "needs_reply", waiting: "needs_reply", closed: "needs_reply" },
};
export const nextStatus = (from: Status, e: InquiryEventName): Status | null => MOVES[e][from] ?? null;
export const isOpen = (s: Status) => s === "new" || s === "needs_reply";

export const TABS = ["open", "waiting", "closed", "all", "unmatched"] as const;
export type Tab = (typeof TABS)[number];
export const TAB_LABEL: Record<Tab, string> = { open: "Open", waiting: "Waiting on customer", closed: "Closed", all: "All", unmatched: "Unmatched" };
export const parseTab = (v: string | undefined): Tab => ((TABS as readonly string[]).includes(v ?? "") ? (v as Tab) : "open");
export function statusesForTab(t: Exclude<Tab, "unmatched">): Status[] {
  switch (t) {
    case "open": return ["new", "needs_reply"];
    case "waiting": return ["waiting"];
    case "closed": return ["closed"];
    case "all": return [...STATUSES];
  }
}

// "40 min", "2 h", "3 days" (Mountain calendar days once it's a day or more).
export function waitText(sinceIso: string, nowMs: number): string {
  const mins = Math.floor((nowMs - Date.parse(sinceIso)) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h`;
  const days = Math.max(1, daysBetween(localDate(Date.parse(sinceIso)), localDate(nowMs)));
  return `${days} day${days === 1 ? "" : "s"}`;
}

// Open: since the customer's last message, late after the business-day mark.
// Waiting: since our reply (never late — the customer's turn). Closed: none.
export function waitInfo(i: Pick<InquiryRow, "status" | "last_customer_at" | "created_at" | "waiting_since">, nowMs: number): { since: string; text: string; late: boolean } | null {
  if (i.status === "closed") return null;
  if (i.status === "waiting") {
    const since = i.waiting_since ?? i.created_at;
    return { since, text: waitText(since, nowMs), late: false };
  }
  const since = i.last_customer_at ?? i.created_at;
  return { since, text: waitText(since, nowMs), late: businessDaysSince(since, nowMs) >= INQUIRY_LATE_BUSINESS_DAYS };
}

// The list footer's "oldest waiting" figure — business days, distinct from
// the per-row clock (waitText, calendar days/hours/minutes).
export function businessDayText(sinceIso: string, nowMs: number): string {
  const n = businessDaysSince(sinceIso, nowMs);
  return n === 0 ? "under a business day" : `${n} business day${n === 1 ? "" : "s"}`;
}

export const refLabel = (ref: number) => `Q-${ref}`;
export function parseRef(s: string | null | undefined): number | null {
  const m = /^\s*(?:q-?)?(\d{1,9})\s*$/i.exec(s ?? "");
  return m ? Number(m[1]) : null;
}

// PostgREST or-filters break on commas, parentheses and quotes; % and _ are
// wildcards; * isn't meaningful to the ilike search, so it's stripped too.
export const cleanSearch = (q: string): string => q.trim().replace(/[%_\\,()"*]/g, "").slice(0, 100);

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] || "Customer";

// The ack email's "Hi {name}" greeting: a first name outside the name
// charset (digits, emoji, …) or absurdly long becomes "Hi there" instead.
const GREETING_NAME_RE = /^[A-Za-z' -]{1,40}$/;
export const greetingName = (name: string): string => { const f = firstName(name); return GREETING_NAME_RE.test(f) ? f : "there"; };

export type HistoryRow = { action: string; actorName: string | null; detail: string | null };
export function historyText(e: HistoryRow): string {
  const by = e.actorName ? ` by ${e.actorName}` : "";
  switch (e.action) {
    case "created": return e.detail === "wholesale" ? "Received from the wholesale form" : "Received from contact form";
    case "customer_replied": return `Customer replied${e.detail ? ` · ${e.detail}` : ""}`;
    case "opened": return `Opened${by}`;
    case "replied": return `Replied${by}${e.detail ? ` · ${e.detail}` : ""}`;
    case "draft_saved": return `Draft saved${by}`;
    case "draft_discarded": return `Draft discarded${by}`;
    case "closed": return `Closed${by}`;
    case "reopened": return `Re-opened${by}`;
    case "auto_closed": return `Closed automatically after ${INQUIRY_AUTO_CLOSE_DAYS} days`;
    case "topic_changed": return `Topic changed to ${e.detail ?? "—"}${by}`;
    case "linked": return `Linked to ${e.detail ?? "an account"}${by}`;
    case "unlinked": return `Account unlinked${by}`;
    case "bounced": return "Reply bounced";
    case "unmatched_attached": return `Email attached from Unmatched${by}`;
    default: return e.action;
  }
}
