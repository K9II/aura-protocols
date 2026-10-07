// No-charge orders (pure): validation and line building. Spec Part B.
export const NO_CHARGE_REASONS = ["seeding", "replacement", "sample", "other"] as const;
export type NoChargeReason = (typeof NO_CHARGE_REASONS)[number];
export const REASON_LABEL: Record<NoChargeReason, string> = { seeding: "Seeding", replacement: "Replacement", sample: "Sample", other: "Other" };
export const NO_CHARGE_NOTE_MAX = 300;
export const NO_CHARGE_MAX_VIALS = 50; // per line — a typo guard, not a business limit

export type StockOption = { slug: string; variantId: string; name: string; strength: string; priceCents: number; available: number; hidden: boolean };
export type NoChargeLine = { slug: string; variantId: string; vials: number };
export type NoChargeInput = { reason: NoChargeReason; replaces: string | null; note: string | null; lines: NoChargeLine[]; email: boolean };
export type NoChargeErrors = Partial<Record<"reason" | "replaces" | "note" | "lines", string>>;

export function parseNoCharge(get: (k: string) => string[], stock: StockOption[]): { ok: true; value: NoChargeInput } | { ok: false; errors: NoChargeErrors } {
  const errors: NoChargeErrors = {};
  const reasonRaw = get("reason")[0] ?? "";
  const reason = (NO_CHARGE_REASONS as readonly string[]).includes(reasonRaw) ? (reasonRaw as NoChargeReason) : null;
  if (!reason) errors.reason = "Pick a reason.";
  const note = (get("note")[0] ?? "").trim() || null;
  if (note && note.length > NO_CHARGE_NOTE_MAX) errors.note = `Keep it under ${NO_CHARGE_NOTE_MAX} characters.`;
  else if (!note && reason === "replacement") errors.note = "Say what happened.";
  else if (!note && reason === "other") errors.note = "Say what the vials are for.";
  const replaces = (get("replaces")[0] ?? "").trim().toUpperCase() || null;
  if (reason === "replacement" && !replaces) errors.replaces = "Pick the original order.";

  const lines: NoChargeLine[] = [];
  const seen = new Set<string>();
  for (const raw of get("line")) {
    const [slug, variantId, n] = raw.split(":");
    const opt = stock.find((s) => s.slug === slug && s.variantId === variantId);
    const label = opt ? `${opt.name} ${opt.strength}` : "";
    const vials = Number(n);
    if (!opt) { errors.lines = "Pick items from the list."; break; }
    if (seen.has(`${slug}:${variantId}`)) { errors.lines = `${label} is listed twice.`; break; }
    seen.add(`${slug}:${variantId}`);
    if (!Number.isInteger(vials) || vials < 1) { errors.lines = "Each item needs at least 1 vial."; break; }
    if (vials > NO_CHARGE_MAX_VIALS) { errors.lines = `At most ${NO_CHARGE_MAX_VIALS} vials per item.`; break; }
    if (vials > opt.available) { errors.lines = `Only ${opt.available} vials of ${label} are available.`; break; }
    lines.push({ slug: slug!, variantId: variantId!, vials });
  }
  if (!errors.lines && lines.length === 0) errors.lines = "Add at least one item.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { reason: reason!, replaces: reason === "replacement" ? replaces : null, note, lines, email: get("email")[0] === "on" } };
}

export type BuiltLine = {
  compoundSlug: string; compoundName: string; variantId: string; strength: string;
  packQty: 1; quantity: number; unitPriceCents: 0; lineTotalCents: 0; retailUnitCents: number;
};
export function buildLines(lines: NoChargeLine[], stock: StockOption[]): BuiltLine[] {
  return lines.map((l) => {
    const o = stock.find((s) => s.slug === l.slug && s.variantId === l.variantId)!;
    return { compoundSlug: o.slug, compoundName: o.name, variantId: o.variantId, strength: o.strength, packQty: 1, quantity: l.vials, unitPriceCents: 0, lineTotalCents: 0, retailUnitCents: o.priceCents };
  });
}
export function summary(lines: BuiltLine[]): { vials: number; retailCents: number } {
  return { vials: lines.reduce((s, l) => s + l.quantity, 0), retailCents: lines.reduce((s, l) => s + l.quantity * l.retailUnitCents, 0) };
}

// createNoChargeOrder failed. `order` is the row it left behind (its cleanup
// delete failed too), so the caller can cancel it; null when nothing is left.
export class NoChargeCreateError extends Error {
  constructor(message: string, readonly order: { id: string; orderNumber: string } | null) {
    super(message);
    this.name = "NoChargeCreateError";
  }
}
