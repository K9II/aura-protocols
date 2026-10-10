// Discount-code rules: types, code text, batch generation, status and
// plain-English descriptions. Pure — safe on client and server.
import { NEW_ACCOUNT_PCT } from "@/lib/account/offer";

// The owner-editable store-wide cap (shop_settings.max_discount_pct). Its
// floor is the new-account percent, so the advertised welcome offer is never
// trimmed by the cap. (The database check is looser, 15–60; this is stricter.)
export const CAP_MIN_PCT = NEW_ACCOUNT_PCT;
export const CAP_MAX_PCT = 60;

export type CodeKind = "item_pct" | "order_pct" | "order_amount" | "ship_only";
export type StoredStatus = "active" | "paused" | "ended";
export type CodeStatus = "active" | "scheduled" | "paused" | "ended" | "used_up";

// What the pricing engine needs to know about a code.
export type CodeTerms = {
  kind: CodeKind;
  value: number;            // percent for *_pct, cents for order_amount, 0 for ship_only
  stackOnTop: boolean;      // order kinds only
  freeShipping: boolean;
  minOrderCents: number | null;
  includeSlugs: string[]; excludeSlugs: string[];
  includeClasses: string[]; excludeClasses: string[];
};

export type DiscountCodeRow = {
  id: string; code: string; note: string | null; kind: CodeKind; value: number;
  stack_on_top: boolean; free_shipping: boolean; starts_at: string | null; ends_at: string | null;
  max_uses: number | null; once_per_customer: boolean; locked_email: string | null; min_order_cents: number | null;
  include_slugs: string[]; exclude_slugs: string[]; include_classes: string[]; exclude_classes: string[];
  status: StoredStatus; batch_id: string | null; created_by: string | null; created_at: string;
};

export function termsFromRow(r: DiscountCodeRow): CodeTerms {
  return {
    kind: r.kind, value: r.value, stackOnTop: r.stack_on_top, freeShipping: r.free_shipping, minOrderCents: r.min_order_cents,
    includeSlugs: r.include_slugs, excludeSlugs: r.exclude_slugs, includeClasses: r.include_classes, excludeClasses: r.exclude_classes,
  };
}

export function normalizeAdminCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export type AdminCodeCheck = { ok: true; code: string } | { ok: false; reason: "length" | "characters" };

export function validateAdminCode(raw: string): AdminCodeCheck {
  const code = normalizeAdminCode(raw);
  if (code.length < 3 || code.length > 24) return { ok: false, reason: "length" };
  if (!/^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$/.test(code)) return { ok: false, reason: "characters" };
  return { ok: true, code };
}

export const ADMIN_CODE_REASON: Record<"length" | "characters" | "taken", string> = {
  length: "Use 3–24 letters, numbers or dashes.",
  characters: "Letters, numbers and dashes only, starting and ending with a letter or number.",
  taken: "That code is already used by another discount or a partner.",
};

// No 0/O, 1/I/L — the same alphabet partner codes use.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const BATCH_SUFFIX_LENGTH = 5;
export const MAX_BATCH_SIZE = 5000;

export function normalizePrefix(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
}

export function generateBatchCodes(prefix: string, count: number, rand: () => number = Math.random): string[] {
  const out = new Set<string>();
  while (out.size < count) {
    let s = "";
    for (let i = 0; i < BATCH_SUFFIX_LENGTH; i++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)];
    out.add(`${prefix}${s}`);
  }
  return [...out];
}

// `uses` = held + used redemptions.
export function codeStatus(
  r: Pick<DiscountCodeRow, "status" | "starts_at" | "ends_at" | "max_uses">, uses: number, nowMs: number = Date.now(),
): CodeStatus {
  if (r.status === "ended" || (r.ends_at && Date.parse(r.ends_at) <= nowMs)) return "ended";
  if (r.max_uses != null && uses >= r.max_uses) return "used_up";
  if (r.status === "paused") return "paused";
  if (r.starts_at && Date.parse(r.starts_at) > nowMs) return "scheduled";
  return "active";
}

export const STATUS_LABEL: Record<CodeStatus, string> = {
  active: "Active", scheduled: "Scheduled", paused: "Paused", ended: "Ended", used_up: "Used up",
};

const dollars = (cents: number) => (cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`);

function itemsWord(t: CodeTerms): string {
  return t.includeClasses.length === 1 && t.includeSlugs.length === 0 ? t.includeClasses[0] : "items";
}

// Admin list, "Gives" column.
export function describeRule(t: CodeTerms): string {
  const ship = t.freeShipping ? " + free shipping" : "";
  switch (t.kind) {
    case "item_pct": return `${t.value}% off ${itemsWord(t)}${ship}`;
    case "order_pct": return `${t.value}% off order${t.stackOnTop ? ", on top" : ""}${ship}`;
    case "order_amount": return `${dollars(t.value)} off order${t.stackOnTop ? ", on top" : ""}${ship}`;
    case "ship_only": return "Free shipping";
  }
}

// Customer messages: "SPRING20 applied — 20% off your order and free shipping."
export function customerSummary(t: CodeTerms): string {
  const ship = t.freeShipping ? " and free shipping" : "";
  switch (t.kind) {
    case "item_pct": return `${t.value}% off ${itemsWord(t)}${ship}`;
    case "order_pct": return `${t.value}% off your order${ship}`;
    case "order_amount": return `${dollars(t.value)} off your order${ship}`;
    case "ship_only": return "free shipping";
  }
}

function listJoin(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}`;
}

// The create form's live summary (mock screen 2).
export function ruleSentence(code: string, t: CodeTerms, nameOf: (slug: string) => string): string {
  const parts: string[] = [];
  const ship = t.freeShipping ? ", and adds free shipping" : "";
  switch (t.kind) {
    case "item_pct":
      parts.push(`${code} takes ${t.value}% off each item, unless its pack price or another discount is already larger${ship}.`); break;
    case "order_pct":
    case "order_amount": {
      const amount = t.kind === "order_pct" ? `${t.value}%` : dollars(t.value);
      parts.push(t.stackOnTop
        ? `${code} takes ${amount} off the goods total after pack, new-account and partner discounts${ship}.`
        : `${code} takes ${amount} off the goods total, or keeps the item discounts if they save more${ship}.`);
      break;
    }
    case "ship_only": parts.push(`${code} gives free shipping.`); break;
  }
  if (t.minOrderCents) parts.push(`Orders of ${dollars(t.minOrderCents)} or more.`);
  const only = [...t.includeClasses, ...t.includeSlugs.map(nameOf)];
  const not = [...t.excludeClasses, ...t.excludeSlugs.map(nameOf)];
  if (t.kind !== "ship_only" && only.length) parts.push(`Only on ${listJoin(only)}.`);
  if (t.kind !== "ship_only" && not.length) parts.push(`Not on ${listJoin(not)}.`);
  return parts.join(" ");
}
