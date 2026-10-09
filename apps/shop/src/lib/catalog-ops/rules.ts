// Pure rules for admin Catalog & lots. No I/O.
import { PURITY_FLOOR_PCT } from "@/lib/constants";
import { byStrength, stockState, type CatalogOps, type LotStockRow } from "@/lib/catalog-merge";
// Lives in catalog-merge (the merge sorts with it; importing rules there would be circular).
export { strengthSortKey } from "@/lib/catalog-merge";
import type { StockState } from "@/data/catalog-types";

export const DEFAULT_LOW_AT = 20;
export const PURITY_MIN = 90;
export const COA_MAX_BYTES = 10 * 1024 * 1024;   // same as the coa bucket limit (catalog-ops.sql)
export const LOT_NUMBER_RE = /^[A-Z0-9][A-Z0-9-]{2,39}$/;
export const SKU_RE = /^[A-Z0-9][A-Z0-9-]{1,39}$/;
export const METHODS = ["HPLC", "HPLC+MS"] as const;
export const COUNT_REASONS = ["damaged", "recount", "found", "owner_withdrawal", "other"] as const;
export type CountReason = (typeof COUNT_REASONS)[number];
export const COUNT_REASON_LABEL: Record<CountReason, string> = { damaged: "Damaged", recount: "Recount", found: "Found", owner_withdrawal: "Owner withdrawal", other: "Other" };
// Owner withdrawal = vials the owner takes out of stock (an owner's draw at cost
// in the books). Remove only, and the note must say what they were for.
export const NOTE_REQUIRED: readonly CountReason[] = ["owner_withdrawal", "other"];

type Fail = { ok: false; fieldErrors: Record<string, string> };
const intIn = (s: string, min: number, max: number) => { const n = Number(s.trim()); return Number.isInteger(n) && n >= min && n <= max ? n : null; };

export type ReceiveInput = {
  lotNumber: string; purity: string; method: string; testedOn: string; ordered: string; counted: string; damaged: string; note: string; coaPath: string;
  supplier?: string; cost?: string; testCost?: string;
};
export type ReceiveValue = {
  lotNumber: string; purityPct: number; method: (typeof METHODS)[number]; testedOn: string;
  orderedQty: number; countedQty: number; damagedQty: number; discrepancyNote: string | null; coaPath: string | null;
  // What the lot cost (lot-costs.sql): null = not recorded.
  supplier: string | null; costCents: number | null; testCents: number | null;
};

// "520", "520.50", "$1,040" → cents; "" → null; anything else → undefined (an error).
export function dollarsToCents(s: string | undefined, max = 1_000_000): number | null | undefined {
  const t = (s ?? "").replace(/[$,\s]/g, "");
  if (t === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return undefined;
  const c = Math.round(Number(t) * 100);
  return c <= max * 100 ? c : undefined;
}

export function isDiscrepancy(ordered: number, counted: number, damaged: number): boolean {
  return counted !== ordered || damaged > 0;
}

export function parseReceive(i: ReceiveInput, today: string):
  { ok: true; value: ReceiveValue; warnings: { purity?: string } } | Fail {
  const e: Record<string, string> = {};
  const lotNumber = i.lotNumber.trim().toUpperCase();
  if (!LOT_NUMBER_RE.test(lotNumber)) e.lotNumber = "3–40 letters, digits or dashes.";
  const purity = Number(i.purity.trim());
  if (!Number.isFinite(purity) || purity < PURITY_MIN || purity > 100) e.purity = `Between ${PURITY_MIN} and 100.`;
  const method = METHODS.find((m) => m === i.method);
  if (!method) e.method = "Pick HPLC or HPLC + MS.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.testedOn)) e.testedOn = "Pick the test date.";
  else if (i.testedOn > today) e.testedOn = "The test date can't be in the future.";
  let ordered: number | null = null;
  if (!i.ordered.trim()) e.ordered = "Required.";
  else { ordered = intIn(i.ordered, 0, 100000); if (ordered === null) e.ordered = "Whole vials."; }
  let counted: number | null = null;
  if (!i.counted.trim()) e.counted = "Required.";
  else { counted = intIn(i.counted, 0, 100000); if (counted === null) e.counted = "Whole vials."; }
  const damaged = intIn(i.damaged || "0", 0, 100000);
  if (damaged === null) e.damaged = "Whole vials.";
  else if (counted !== null && damaged > counted) e.damaged = "Can't be more than counted.";
  const note = i.note.trim().slice(0, 500);
  if (ordered !== null && counted !== null && damaged !== null && !e.damaged && isDiscrepancy(ordered, counted, damaged) && !note) {
    e.note = "Say what happened — the counts don't match the invoice.";
  }
  const supplier = (i.supplier ?? "").trim().slice(0, 80) || null;
  const costCents = dollarsToCents(i.cost);
  if (costCents === undefined) e.cost = "Dollars, like 520 or 520.50.";
  const testCents = dollarsToCents(i.testCost);
  if (testCents === undefined) e.testCost = "Dollars, like 250.";
  if (costCents != null && !supplier) e.supplier = "Pick the supplier this cost is for.";
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return {
    ok: true,
    warnings: purity < PURITY_FLOOR_PCT ? { purity: `Below the ${PURITY_FLOOR_PCT}% shown on the site.` } : {},
    value: {
      lotNumber, purityPct: Math.round(purity * 100) / 100, method: method!, testedOn: i.testedOn,
      orderedQty: ordered!, countedQty: counted!, damagedQty: damaged!, discrepancyNote: note || null, coaPath: i.coaPath.trim() || null,
      supplier, costCents: costCents ?? null, testCents: testCents ?? null,
    },
  };
}

export function liveRefusal(l: { status: string; coaPath: string | null; sellable: number }): string | null {
  if (l.status !== "draft") return "This lot is already live.";
  if (!l.coaPath) return "Attach the certificate first.";
  if (l.sellable <= 0) return "Nothing to sell — every vial is damaged.";
  return null;
}

export function parseCorrection(i: { direction: string; vials: string; reason: string; note: string }):
  { ok: true; value: { delta: number; reason: CountReason; note: string | null } } | Fail {
  const e: Record<string, string> = {};
  const n = intIn(i.vials, 1, 100000);
  if (n === null) e.vials = "At least 1 vial.";
  const reason = COUNT_REASONS.find((r) => r === i.reason);
  if (!reason) e.reason = "Pick a reason.";
  const note = i.note.trim().slice(0, 300);
  if (reason === "other" && !note) e.note = "Other needs a note.";
  if (reason === "owner_withdrawal" && !note) e.note = "Say what the vials are for.";
  if (reason === "owner_withdrawal" && i.direction === "add") e.reason = "Owner withdrawal only removes vials.";
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return { ok: true, value: { delta: i.direction === "add" ? n! : -n!, reason: reason!, note: note || null } };
}

// ---- strengths ----
export const STRENGTH_UNITS = ["mg", "mcg", "IU"] as const;
export type StrengthUnit = (typeof STRENGTH_UNITS)[number];
// What customers see ("30 mg") and the key derived from it ("30mg", "5000iu").
export function parseStrength(amount: string, unit: string):
  { ok: true; value: { strength: string; variantId: string } } | { ok: false; error: string } {
  const u = STRENGTH_UNITS.find((x) => x === unit);
  if (!u) return { ok: false, error: "Pick mg, mcg or IU." };
  const a = amount.trim();
  const n = Number(a);
  if (!/^\d+(\.\d{1,2})?$/.test(a) || !(n > 0) || n > 100000) return { ok: false, error: "An amount above 0, up to 2 decimals." };
  const strength = `${String(n)} ${u}`;
  return { ok: true, value: { strength, variantId: strength.replace(/\s+/g, "").toLowerCase() } };
}

export function parsePrice(s: string): { ok: true; value: number } | { ok: false; error: string } {
  const n = Number(s.trim().replace(/^\$/, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 100000) return { ok: false, error: "A price above $0." };
  return { ok: true, value: Math.round(n * 100) };
}
export function parseLowAt(s: string): { ok: true; value: number } | { ok: false; error: string } {
  if (!s.trim()) return { ok: false, error: "Required." };
  const n = intIn(s, 0, 10000);
  return n === null ? { ok: false, error: "Whole vials, 0 or more." } : { ok: true, value: n };
}
export function parseSku(s: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const v = s.trim().toUpperCase();
  if (!v) return { ok: true, value: null };
  return SKU_RE.test(v) ? { ok: true, value: v } : { ok: false, error: "Letters, digits and dashes." };
}

// ---- admin list ----
export type AdminLotRow = LotStockRow & {
  ordered_qty: number; counted_qty: number; damaged_qty: number; adjust_qty: number; discrepancy_note: string | null;
  received_by: string | null; received_by_name: string | null; received_at: string; retired_at: string | null;
};

// Same order as hold_vials (oldest lot first; live_at ties broken by lot_number).
export function byLiveThenNumber(a: AdminLotRow, b: AdminLotRow): number {
  return (a.live_at ?? "").localeCompare(b.live_at ?? "") || a.lot_number.localeCompare(b.lot_number);
}
export type AdminOps = Omit<CatalogOps, "lots"> & { lots: AdminLotRow[] };
type ContentLite = { slug: string; name: string; chemicalClass: string };
export type LotRef = { lotNumber: string; purityPct: number; method: string; status: "draft" | "live" | "retired"; discrepancy: boolean; available: number; sellable: number };
// shown = on the store (product shown AND strength shown AND not archived).
export type AdminRow = {
  slug: string; name: string; chemicalClass: string; variantId: string; strength: string;
  priceCents: number; lowAt: number; sku: string | null; shown: boolean;
  productShown: boolean; strengthShown: boolean; archivedAt: string | null;
  available: number; held: number; stock: StockState; selling: LotRef | null; next: LotRef | null; lastSoldOut: string | null;
  hasDraft: boolean; hasDiscrepancy: boolean;
  wholesale: boolean;   // offered as a 10-vial wholesale kit (catalog_variants.wholesale)
};

const ref = (l: AdminLotRow): LotRef => ({
  lotNumber: l.lot_number, purityPct: Number(l.purity_pct), method: l.method, status: l.status,
  discrepancy: isDiscrepancy(l.ordered_qty, l.counted_qty, l.damaged_qty), available: l.available, sellable: l.sellable,
});

export function adminRows(content: ContentLite[], ops: AdminOps): AdminRow[] {
  const shown = new Map(ops.products.map((p) => [p.slug, p.shown]));
  const rows: AdminRow[] = [];
  for (const c of content) {
    for (const vr of ops.variants.filter((x) => x.slug === c.slug).sort(byStrength)) {
      const lots = ops.lots.filter((l) => l.slug === c.slug && l.variant_id === vr.variant_id);
      const live = lots.filter((l) => l.status === "live").sort(byLiveThenNumber);
      const withVials = live.filter((l) => l.available > 0);
      const drafts = lots.filter((l) => l.status === "draft").sort((a, b) => a.lot_number.localeCompare(b.lot_number));
      const available = withVials.reduce((s, l) => s + l.available, 0);
      const selling = withVials[0] ?? null;
      const nextLot = withVials[1] ?? drafts[0] ?? null;
      const soldOut = live.filter((l) => l.available <= 0);
      const productShown = shown.get(c.slug) ?? false;
      rows.push({
        slug: c.slug, name: c.name, chemicalClass: c.chemicalClass, variantId: vr.variant_id, strength: vr.strength,
        priceCents: vr.price_cents, lowAt: vr.low_at, sku: vr.threepl_sku, shown: productShown && vr.shown && !vr.archived_at,
        productShown, strengthShown: vr.shown, archivedAt: vr.archived_at,
        available, held: live.reduce((s, l) => s + l.held, 0), stock: stockState(available, vr.low_at),
        selling: selling ? ref(selling) : null, next: nextLot ? ref(nextLot) : null,
        lastSoldOut: soldOut.length ? soldOut[soldOut.length - 1].lot_number : null,
        wholesale: vr.wholesale !== false,
        hasDraft: drafts.length > 0, hasDiscrepancy: lots.some((l) => l.status !== "retired" && isDiscrepancy(l.ordered_qty, l.counted_qty, l.damaged_qty)),
      });
    }
  }
  return rows;
}

export const CATALOG_TABS = ["all", "low", "out", "hidden", "drafts", "discrepancies", "archived"] as const;
export type CatalogTab = (typeof CATALOG_TABS)[number];
export const TAB_LABEL: Record<CatalogTab, string> = { all: "All", low: "Low", out: "Out of stock", hidden: "Hidden", drafts: "Draft lots", discrepancies: "Discrepancies", archived: "Archived" };

// Archived strengths appear only under Archived. Hidden = product or strength
// hidden; Low / Out only count strengths on the store.
export function rowsForTab(rows: AdminRow[], tab: CatalogTab): AdminRow[] {
  if (tab === "archived") return rows.filter((r) => r.archivedAt);
  const active = rows.filter((r) => !r.archivedAt);
  switch (tab) {
    case "low": return active.filter((r) => r.shown && r.stock === "low");
    case "out": return active.filter((r) => r.shown && r.stock === "out");
    case "hidden": return active.filter((r) => !r.shown);
    case "drafts": return active.filter((r) => r.hasDraft);
    case "discrepancies": return active.filter((r) => r.hasDiscrepancy);
    default: return active;
  }
}
export function tabCounts(rows: AdminRow[]): Record<CatalogTab, number> {
  return Object.fromEntries(CATALOG_TABS.map((t) => [t, rowsForTab(rows, t).length])) as Record<CatalogTab, number>;
}
export function searchRows(rows: AdminRow[], q: string, lotNumbersBySlugVariant: Map<string, string[]>): AdminRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => r.name.toLowerCase().includes(needle) || r.slug.includes(needle)
    || (lotNumbersBySlugVariant.get(`${r.slug}:${r.variantId}`) ?? []).some((n) => n.toLowerCase().includes(needle)));
}

// ---- orders / checkout ----
export type LotQty = { lotNumber: string; qty: number };
export function lotsMatch(allocated: LotQty[], shipped: LotQty[]): boolean {
  const key = (xs: LotQty[]) => [...xs].sort((a, b) => a.lotNumber.localeCompare(b.lotNumber)).map((x) => `${x.lotNumber}:${x.qty}`).join("|");
  return key(allocated) === key(shipped);
}

export function soldOutMessage(items: Array<{ name: string; strength: string }>): string {
  const names = items.map((i) => `${i.name} ${i.strength}`);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `${list} just sold out — we've removed ${names.length === 1 ? "it" : "them"} from your cart.`;
}

export function coaObjectPath(lotNumber: string, nowMs: number): string {
  return `${lotNumber}/${nowMs}.pdf`;
}

// Does this submitted path actually belong to this lot's own folder — not
// another lot's, not a traversal attempt? Exact match against what
// coaObjectPath produces: `<lot>/<13-digit ms timestamp>.pdf`.
export function isCoaPathFor(lotNumber: string, path: string): boolean {
  return new RegExp(`^${lotNumber}/\\d{13}\\.pdf$`).test(path);
}
