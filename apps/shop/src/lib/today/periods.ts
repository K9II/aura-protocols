// Today / 7 days / 30 days in shop time, and the stretch just before each
// ("by now": the prior period ends at the same time of day). Pure; DST-safe
// because every boundary is a Mountain wall-clock time converted by zonedToIso.
import { zonedToIso } from "@/lib/discounts/time";
import { addDays, dateLabel, localStamp } from "@/lib/today/time";

export const PERIODS = ["today", "7d", "30d"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_DAYS: Record<Period, number> = { today: 1, "7d": 7, "30d": 30 };
export const PERIOD_LABEL: Record<Period, string> = { today: "Today", "7d": "7 days", "30d": "30 days" };
export const PERIOD_SHORT: Record<Period, string> = { today: "Today", "7d": "7 d", "30d": "30 d" };
export const VS_LABEL: Record<Period, string> = { today: "vs yesterday by now", "7d": "vs prior 7 days", "30d": "vs prior 30 days" };
export const parsePeriod = (v: string | undefined): Period => ((PERIODS as readonly string[]).includes(v ?? "") ? (v as Period) : "today");

export type Range = { from: string; to: string };
// keys: local bucket starts as admin_sales_summary writes them ('YYYY-MM-DDTHH:MI').
export type PeriodRanges = { cur: Range; prior: Range; bucket: "hour" | "day"; keys: string[]; nowIndex: number };

export function periodRanges(p: Period, nowMs: number): PeriodRanges {
  const stamp = localStamp(nowMs);
  const today = stamp.slice(0, 10), time = stamp.slice(11);
  const days = PERIOD_DAYS[p];
  const start = addDays(today, -(days - 1));
  const cur = { from: zonedToIso(`${start}T00:00`), to: new Date(nowMs).toISOString() };
  const prior = { from: zonedToIso(`${addDays(start, -days)}T00:00`), to: zonedToIso(`${addDays(today, -days)}T${time}`) };
  if (p === "today") {
    const keys = Array.from({ length: 24 }, (_, h) => `${today}T${String(h).padStart(2, "0")}:00`);
    return { cur, prior, bucket: "hour", keys, nowIndex: Number(time.slice(0, 2)) };
  }
  const keys = Array.from({ length: days }, (_, i) => `${addDays(start, i)}T00:00`);
  return { cur, prior, bucket: "day", keys, nowIndex: days - 1 };
}

export function fillBuckets(keys: string[], rows: Array<{ at: string; cents: number }>): number[] {
  const byKey = new Map(rows.map((r) => [r.at, r.cents]));
  return keys.map((k) => byKey.get(k) ?? 0);
}

export function axisLabels(p: Period, keys: string[]): string[] {
  if (p === "today") return ["12a", "6a", "12p", "6p", "11p"];
  const step = keys.length >= 30 ? 10 : 3;
  const idx: number[] = [];
  for (let i = 0; i < keys.length; i += step) idx.push(i);
  if (idx[idx.length - 1] !== keys.length - 1) idx.push(keys.length - 1);
  return idx.map((i) => dateLabel(keys[i].slice(0, 10)));
}
