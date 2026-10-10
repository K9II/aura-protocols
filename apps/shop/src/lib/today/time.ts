// Shop-time (Mountain) helpers for Today. Pure.
import { SHOP_TZ, dateTime, isoToZonedLocal, shortDate } from "@/lib/discounts/time";
import { SHIP_LATE_BUSINESS_DAYS } from "@/lib/today/constants";

const DAY = 86_400_000;
const utcNoon = (date: string) => Date.parse(`${date}T12:00:00Z`);
const ampm = (s: string) => s.replace(/\s([AP])M$/, (_, x: string) => ` ${x.toLowerCase()}m`);

// "2026-10-06T09:42" — the shop's wall clock at that instant.
export const localStamp = (ms: number): string => isoToZonedLocal(new Date(ms).toISOString());
export const localDate = (ms: number): string => localStamp(ms).slice(0, 10);
export const addDays = (date: string, n: number): string => new Date(utcNoon(date) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string): number => Math.round((utcNoon(b) - utcNoon(a)) / DAY);
export const isWeekday = (date: string): boolean => { const d = new Date(utcNoon(date)).getUTCDay(); return d !== 0 && d !== 6; };

// Mon–Fri shop days after the day it was paid, up to and including today.
export function businessDaysSince(iso: string, nowMs: number): number {
  const end = localDate(nowMs);
  let d = localDate(Date.parse(iso));
  let n = 0;
  while (d < end) {
    d = addDays(d, 1);
    if (isWeekday(d)) n++;
  }
  return n;
}

export function shipAge(paidIso: string, nowMs: number): { text: string; late: boolean } {
  const bus = businessDaysSince(paidIso, nowMs);
  if (bus > SHIP_LATE_BUSINESS_DAYS) return { text: `${bus} bus. days · late`, late: true };
  const days = daysBetween(localDate(Date.parse(paidIso)), localDate(nowMs));
  return { text: days <= 0 ? "today" : `${days} day${days === 1 ? "" : "s"}`, late: false };
}

export const timeOfDay = (iso: string): string =>
  ampm(new Date(iso).toLocaleTimeString("en-US", { timeZone: SHOP_TZ, hour: "numeric", minute: "2-digit" }));
export const hourLabel = (ms: number): string =>
  ampm(new Date(ms).toLocaleTimeString("en-US", { timeZone: SHOP_TZ, hour: "numeric" }));

// "8:15 am" today, "Oct 3, 2:41 pm" any other day.
export function whenText(iso: string, nowMs: number): string {
  return localDate(Date.parse(iso)) === localDate(nowMs) ? timeOfDay(iso) : dateTime(iso);
}

export function paidText(iso: string, nowMs: number): string {
  if (localDate(Date.parse(iso)) === localDate(nowMs)) return `paid today ${timeOfDay(iso)}`;
  const weekday = new Date(iso).toLocaleDateString("en-US", { timeZone: SHOP_TZ, weekday: "short" });
  return `paid ${weekday}, ${shortDate(iso)}`;
}

export function headerDate(nowMs: number): string {
  const day = new Date(nowMs).toLocaleDateString("en-US", { timeZone: SHOP_TZ, weekday: "long", month: "short", day: "numeric" });
  return `${day} · shop time (Mountain) · ${timeOfDay(new Date(nowMs).toISOString())}`;
}

// "2026-09-12" (a shop date) → "Sep 12".
export const dateLabel = (date: string): string =>
  new Date(utcNoon(date)).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
