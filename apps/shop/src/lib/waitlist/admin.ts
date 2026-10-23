// The Command Center's Waitlist page (2026-10-23): counts, the searchable
// list, top referrers and the CSV. Pure — the rows come from
// lib/waitlist/admin-data.ts. Times are shop time (lib/today/time.ts).
import { localDate, addDays } from "@/lib/today/time";
import { inviteLabel } from "./codes";

export const WAITLIST_PAGE_SIZE = 50;
export const TOP_REFERRERS = 10;
// "Joined · 7 days" counts today and the six days before it, like Today's 7-day period.
export const WAITLIST_WEEK_DAYS = 7;

export type WaitlistStatus = "pending" | "confirmed" | "unsubscribed";
export type WaitlistDbRow = {
  email: string; status: WaitlistStatus; waitlist_at: string;
  referral_code: string | null; referred_by: string | null;
};
export type WaitlistRow = {
  email: string; status: WaitlistStatus; joinedAt: string;
  code: string | null; inviteLabel: string | null;
  referrerEmail: string | null; colleagues: number;
};
export type WaitlistCounts = { onList: number; today: number; week: number; invited: number; unsubscribed: number };

// Newest first. Who brought each person in comes from the referrer's own row;
// colleagues = rows whose referred_by is this person's code.
export function shapeWaitlist(db: WaitlistDbRow[], site: string): WaitlistRow[] {
  const byCode = new Map<string, string>();
  const brought = new Map<string, number>();
  for (const r of db) if (r.referral_code) byCode.set(r.referral_code, r.email);
  for (const r of db) if (r.referred_by) brought.set(r.referred_by, (brought.get(r.referred_by) ?? 0) + 1);
  return [...db]
    .sort((a, b) => (a.waitlist_at < b.waitlist_at ? 1 : a.waitlist_at > b.waitlist_at ? -1 : a.email.localeCompare(b.email)))
    .map((r) => ({
      email: r.email, status: r.status, joinedAt: r.waitlist_at,
      code: r.referral_code, inviteLabel: r.referral_code ? inviteLabel(site, r.referral_code) : null,
      referrerEmail: r.referred_by ? byCode.get(r.referred_by) ?? null : null,
      colleagues: r.referral_code ? brought.get(r.referral_code) ?? 0 : 0,
    }));
}

// onList leaves out anyone who unsubscribed; the joined counts include them (they did join).
export function waitlistCounts(rows: WaitlistRow[], nowMs: number): WaitlistCounts {
  const today = localDate(nowMs);
  const weekStart = addDays(today, -(WAITLIST_WEEK_DAYS - 1));
  let onList = 0, t = 0, week = 0, invited = 0, unsubscribed = 0;
  for (const r of rows) {
    const d = localDate(Date.parse(r.joinedAt));
    if (r.status === "unsubscribed") unsubscribed++; else onList++;
    if (d === today) t++;
    if (d >= weekStart) week++;
    if (r.referrerEmail) invited++;
  }
  return { onList, today: t, week, invited, unsubscribed };
}

// Most colleagues first; ties go to whoever joined first.
export function topReferrers(rows: WaitlistRow[], n: number = TOP_REFERRERS): WaitlistRow[] {
  return rows.filter((r) => r.colleagues > 0)
    .sort((a, b) => b.colleagues - a.colleagues || a.joinedAt.localeCompare(b.joinedAt))
    .slice(0, n);
}

// Search box: part of an email, or an invite code (theirs or the one they came through).
export function cleanWaitlistSearch(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().slice(0, 100);
}
export function searchWaitlist(rows: WaitlistRow[], q: string): WaitlistRow[] {
  if (!q) return rows;
  return rows.filter((r) => r.email.includes(q) || (r.code ?? "").toLowerCase() === q || (r.referrerEmail ?? "").includes(q));
}

export const STATUS_LABEL: Record<WaitlistStatus, string> = { confirmed: "On the list", pending: "Not confirmed", unsubscribed: "Unsubscribed" };

// One CSV cell: a leading = + - @ (or tab/CR) would run as a spreadsheet
// formula, so it gets a ' in front; commas, quotes and newlines get quoted.
export function csvCell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function waitlistCsv(rows: WaitlistRow[], site: string): string {
  const head = "email,joined,status,invite_code,invite_link,came_through,colleagues";
  const lines = rows.map((r) => [
    r.email, r.joinedAt, STATUS_LABEL[r.status], r.code ?? "", r.code ? `${site}/?r=${r.code}` : "", r.referrerEmail ?? "", String(r.colleagues),
  ].map(csvCell).join(","));
  return [head, ...lines].join("\n") + "\n";
}
