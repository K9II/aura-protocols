// Owner alerts: the shape and rules shared by alertOwner (storing), Today and
// Past alerts. Pure — lib/notify.ts imports this chain, so keep it small.
import { ALERT_DETAIL_MAX, ALERT_TITLE_MAX } from "@/lib/today/constants";

export type OwnerAlert = {
  id: string; title: string; detail: string; count: number; first_at: string; last_at: string;
  resolved_at: string | null; resolved_by_name: string | null; note: string | null;
};

// The title is the dedupe key (one open alert per title in today.sql), so it
// is normalised the same way every time. Callers keep changing data (order
// numbers, ids, counts, names) in the detail, not here.
export function normalizeAlertTitle(title: string): string {
  const t = title.replace(/\s+/g, " ").trim();
  if (!t) return "Owner alert";
  return t.length > ALERT_TITLE_MAX ? `${t.slice(0, ALERT_TITLE_MAX - 1)}…` : t;
}

export const clipDetail = (detail: string): string =>
  detail.length > ALERT_DETAIL_MAX ? `${detail.slice(0, ALERT_DETAIL_MAX - 1)}…` : detail;

export const firstLine = (s: string): string => s.split("\n").find((l) => l.trim())?.trim() ?? "";

// Past alerts: open first, then newest.
export function sortAlerts(alerts: OwnerAlert[]): OwnerAlert[] {
  return [...alerts].sort((a, b) => Number(!!a.resolved_at) - Number(!!b.resolved_at) || b.last_at.localeCompare(a.last_at));
}
