// When the storefront wears its holiday dressing (the /finish-account offer
// panel's tree, snow and garland). Recurring every year, in shop time
// (America/Denver): from HOLIDAY_START 00:00 through HOLIDAY_END 23:59.
// The window may wrap the new year. Pure — safe on client and server.
import { SHOP_TZ } from "@/lib/discounts/time";

export type MonthDay = { month: number; day: number }; // month 1–12

export const HOLIDAY_START: MonthDay = { month: 12, day: 1 };
export const HOLIDAY_END: MonthDay = { month: 1, day: 1 };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = ({ month, day }: MonthDay) => `${MONTHS[month - 1]} ${day}`;
// "Dec 1 – Jan 1" — for copy (the owner Guide), built from the two constants.
export const HOLIDAY_WINDOW_TEXT = `${label(HOLIDAY_START)} – ${label(HOLIDAY_END)}`;

const dayKey = ({ month, day }: MonthDay) => month * 100 + day;

function shopMonthDay(ms: number): MonthDay {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TZ, month: "numeric", day: "numeric" });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { month: Number(p.month), day: Number(p.day) };
}

export function isHolidaySeason(ms: number): boolean {
  const today = dayKey(shopMonthDay(ms)), start = dayKey(HOLIDAY_START), end = dayKey(HOLIDAY_END);
  return start <= end ? today >= start && today <= end : today >= start || today <= end;
}
