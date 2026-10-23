// Early access: the opening date and the personal codes' terms. Pure.
import { NEW_ACCOUNT_DAYS, NEW_ACCOUNT_PCT } from "@/lib/account/offer";
import { zonedToIso } from "@/lib/discounts/time";
import type { CodeInput } from "@/lib/discounts/data";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const utcNoon = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12));
};
const shopToday = (nowMs: number) => new Date(nowMs).toLocaleDateString("en-CA", { timeZone: "America/Denver" });

// "2026-12-01" → "Tuesday, December 1".
export function openingLabel(d: string): string {
  return utcNoon(d).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
}

export function parseOpeningOn(raw: string, nowMs: number): { ok: true; value: string } | { ok: false; error: string } {
  const v = raw.trim();
  if (!DATE_RE.test(v) || utcNoon(v).toISOString().slice(0, 10) !== v) return { ok: false, error: "Pick the opening date." };
  if (v <= shopToday(nowMs)) return { ok: false, error: "The opening date must be after today." };
  return { ok: true, value: v };
}

// A code works through the last day of the new-account window, counted from opening day.
export function earlyCodeEndsAt(openingOn: string): string {
  const d = utcNoon(openingOn);
  d.setUTCDate(d.getUTCDate() + NEW_ACCOUNT_DAYS);
  return zonedToIso(`${d.toISOString().slice(0, 10)}T23:59`);
}

// One use, the new-account percent, not tied to an email (a forwarded link works).
// The engine's larger-of rule means it never adds to the automatic new-account percent.
export function earlyCodeInput(openingOn: string, email: string): CodeInput {
  return {
    note: `Early access · ${email}`, kind: "item_pct", value: NEW_ACCOUNT_PCT, stack_on_top: false, free_shipping: false,
    starts_at: null, ends_at: earlyCodeEndsAt(openingOn), max_uses: 1, once_per_customer: true, locked_email: null,
    min_order_cents: null, include_slugs: [], exclude_slugs: [], include_classes: [], exclude_classes: [], status: "active",
  };
}
