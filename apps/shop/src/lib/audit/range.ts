// Admin → Activity date filter: whole days in shop time (Mountain).
import { zonedToIso } from "@/lib/discounts/time";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const valid = (d: string | undefined): d is string => !!d && DAY.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

// "2026-10-01".."2026-10-06" → since = Oct 1 00:00 MT, until = Oct 7 00:00 MT
// (exclusive). Either end may be missing; a reversed range is swapped.
export function activityRange(fromRaw?: string, toRaw?: string): { from?: string; to?: string; since?: string; until?: string } {
  let from = valid(fromRaw) ? fromRaw : undefined;
  let to = valid(toRaw) ? toRaw : undefined;
  if (from && to && from > to) [from, to] = [to, from];
  return { from, to, since: from ? zonedToIso(`${from}T00:00`) : undefined, until: to ? zonedToIso(`${nextDay(to)}T00:00`) : undefined };
}

// Quick periods (same rolling days as Today's Numbers), or "dates" = From/To.
export const ACTIVITY_PERIODS = ["today", "7d", "30d", "dates"] as const;
export type ActivityPeriod = (typeof ACTIVITY_PERIODS)[number];
export const PERIOD_LABEL: Record<ActivityPeriod, string> = { today: "Today", "7d": "7 days", "30d": "30 days", dates: "Dates" };
const minusDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

// today = the shop-time date (YYYY-MM-DD). Unknown period → any time.
export function periodRange(period: string | undefined, today: string, fromRaw?: string, toRaw?: string) {
  switch (period) {
    case "today": return { period: "today" as const, ...activityRange(today, today) };
    case "7d": return { period: "7d" as const, ...activityRange(minusDays(today, 6), today) };
    case "30d": return { period: "30d" as const, ...activityRange(minusDays(today, 29), today) };
    case "dates": return { period: "dates" as const, ...activityRange(fromRaw, toRaw) };
    default: return { period: undefined, ...activityRange() };
  }
}
