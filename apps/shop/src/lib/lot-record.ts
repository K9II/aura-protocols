// Lot record (approved 2026-10-10): each released lot drawn as a chromatogram run,
// stacked in depth, newest in front. Pure: picks the lots, marks what's new since
// the visitor's last visit, and computes the drawing geometry. The canvas lives in
// components/store/LotRecord.tsx.
import type { PublicLot } from "@/data/catalog";

export const HOME_RECORD_SIZE = 8;
// Pace of the build: a new run starts every STAGGER ms and takes DRAW ms to draw.
export const RECORD_STAGGER_MS = 450;
export const RECORD_DRAW_MS = 1400;

export type RecordStatus = "live" | "sold_out";

// What the browser gets: no stock counts, only the public lot facts.
export type RecordLot = {
  lot: string;
  slug: string;
  compound: string;
  strength: string;
  purityPct: number;
  method: string;
  testedOn: string;
  liveAt: string;
  coaFile: string;
  status: RecordStatus;
};

const newestFirst = (a: PublicLot, b: PublicLot) => b.liveAt.localeCompare(a.liveAt) || b.lot.localeCompare(a.lot);

// Retired lots were withdrawn, not released: they stay on COA lookup, not on the record.
function toRecord(l: PublicLot): RecordLot | null {
  if (l.status === "retired" || !l.liveAt) return null;
  return {
    lot: l.lot, slug: l.slug, compound: l.compoundName, strength: l.strength, purityPct: l.purityPct,
    method: l.method, testedOn: l.testedOn, liveAt: l.liveAt, coaFile: l.coaFile, status: l.status,
  };
}

// Home: the last N releases across the store (strengths selling now only).
export function homeRecord(lots: PublicLot[], size = HOME_RECORD_SIZE): RecordLot[] {
  return lots.filter((l) => l.onStore).sort(newestFirst).map(toRecord).filter((l): l is RecordLot => l !== null).slice(0, size);
}

// Product page: every released lot of this compound, newest first.
export function productRecord(lots: PublicLot[], slug: string): RecordLot[] {
  return lots.filter((l) => l.slug === slug).sort(newestFirst).map(toRecord).filter((l): l is RecordLot => l !== null);
}

// Lots released after the visitor's previous visit. First visit (no baseline): none.
export function newSince(record: RecordLot[], lastVisitIso: string | null): Set<string> {
  if (!lastVisitIso) return new Set();
  const since = Date.parse(lastVisitIso);
  if (Number.isNaN(since)) return new Set();
  return new Set(record.filter((l) => Date.parse(l.liveAt) > since).map((l) => l.lot));
}

// Top-bar line for a returning visitor; null when nothing is new.
export function newsLine(record: RecordLot[], fresh: Set<string>): string | null {
  const items = record.filter((l) => fresh.has(l.lot));
  if (!items.length) return null;
  const what = items.slice(0, 3).map((l) => `${l.compound} ${l.strength}`).join(" · ");
  const more = items.length > 3 ? ` · +${items.length - 3} more` : "";
  return `${items.length} new ${items.length === 1 ? "lot" : "lots"} since your last visit · ${what}${more}`;
}

// "8 Oct" this year, "8 Oct 2025" otherwise. Dates are calendar dates (testedOn) or
// release instants shown in shop time.
export function shortDate(iso: string, nowMs: number): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = new Date(dateOnly ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  const tz = dateOnly ? "UTC" : "America/Denver";
  const year = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric" }).format(d);
  const thisYear = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", year: "numeric" }).format(new Date(nowMs));
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: tz, ...o }).format(d);
  const dm = `${part({ day: "numeric" })} ${part({ month: "short" })}`;
  return year === thisYear ? dm : `${dm} ${year}`;
}

// ---- geometry (ported from the approved demo) ----
export type RecordGeo = { narrow: boolean; n: number; dx: number; dy: number; tw: number; y0: number; amp: number };

export function recordGeo(W: number, H: number, n: number): RecordGeo {
  const narrow = W < 460;
  const single = n <= 1;
  const amp = single ? Math.min(150, H * 0.42) : narrow ? 62 : Math.min(130, Math.max(70, H * 0.36));
  // n - 1 is 0 for a single lot: no depth step to divide by.
  const dy = single ? 0 : narrow ? 15 : Math.min(40, Math.max(18, (H - 34 - amp) / (n - 1)));
  const dx = single ? 0 : narrow ? 9 : Math.min(16, Math.round(dy * 0.4));
  const tw = single ? W * 0.48 : narrow ? W * 0.4 : W * 0.42;
  const y0 = single ? Math.round(H / 2 + amp / 2) : H - 26; // a single run sits in the middle
  return { narrow, n, dx, dy, tw, y0, amp };
}

export const lotHash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// One run: baseline noise + the main peak (height from purity) + impurity bumps
// whose size adds up to (100 − purity). u runs 0..1 along the run; returns the
// offset above the baseline (negative = up).
export function runY(lot: string, purityPct: number, u: number, amp: number): number {
  const h = lotHash(lot), c = 0.42 + (h % 17) / 100, imp = Math.max(0, 100 - purityPct);
  let y = Math.sin(u * 41 + h) * 0.35 + Math.sin(u * 97 + h * 0.3) * 0.25;
  y -= amp * (0.78 + (purityPct - 99) * 0.3) * Math.exp(-((u - c) ** 2) / (2 * 0.018 ** 2));
  y -= amp * imp * 0.16 * Math.exp(-((u - c + 0.11) ** 2) / (2 * 0.01 ** 2));
  y -= amp * imp * 0.09 * Math.exp(-((u - c - 0.15) ** 2) / (2 * 0.012 ** 2));
  return y;
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
