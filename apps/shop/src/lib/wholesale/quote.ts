// Wholesale quote orders (mocks 2026-10-17 "Quote Order Mocks", quote-orders.sql):
// an accepted volume quote becomes an order at the owner's prices, paid by bank
// transfer or card. Pure — safe on client and server; the server re-prices every save.
import { FREE_SHIPPING_MIN_CENTS, PROTECTION_CENTS, SHIPPING_FLAT_CENTS, type PricedItem } from "@/lib/pricing";
import { addDays } from "@/lib/today/time";
import { GLP_CLASS } from "@/lib/wholesale/margins";
import { KIT_VIALS, MAX_KITS_PER_LINE, QUOTE_BUSINESS_DAY, QUOTE_REPLY_HOURS, QUOTE_REQUEST_EXPIRE_HOURS, VOLUME_QUOTE_MIN_KITS, cutoffFor, estimatedDates, tierFor, type KitRow, type Tier } from "@/lib/wholesale/rules";

// Volume-quote bands, % off retail by the request's total kits (Alvester 2026-10-17: 30–50
// kits 45%, 51–99 50%, 100+ 55% — the order sheet's 5-point steps continued; same bands as
// AIOS → Kits → Volume quote). The form starts
// every line at the band's percent; the owner types the percent actually quoted.
export const QUOTE_BANDS: Tier[] = [{ minKits: 30, pct: 45 }, { minKits: 51, pct: 50 }, { minKits: 100, pct: 55 }];
export function quoteStartPct(kits: number): number {
  return [...QUOTE_BANDS].reverse().find((b) => kits >= b.minKits)?.pct ?? QUOTE_BANDS[0].pct;
}
export const QUOTE_MAX_PCT = 70;
export const QUOTE_VALID_DAYS = 14;        // default "valid until", as the quote reply says
export const QUOTE_MAX_VALID_DAYS = 60;
export const QUOTE_NOTE_MAX = 600;
export const BANK_REF_MAX = 120;

export type QuoteLine = { slug: string; variantId: string; kits: number; pct: number };
export type QuotePrice = {
  items: PricedItem[]; missing: QuoteLine[]; kits: number;
  subtotalCents: number; shippingCents: number; insuranceCents: number; depositCents: number;
  totalBeforeTaxCents: number; balanceBeforeTaxCents: number;
  sheetPct: number; sheetSubtotalCents: number;   // what the order sheet would charge, for the owner's comparison
};

// Each line is priced off retail × 10 at its own percent (never off the order-sheet price).
export function priceQuote(lines: QuoteLine[], rows: KitRow[], s: { depositPct: number; tiers: Tier[] }): QuotePrice {
  const missing: QuoteLine[] = [];
  const merged = new Map<string, { row: KitRow; line: QuoteLine }>();
  for (const l of lines) {
    const row = rows.find((r) => r.slug === l.slug && r.variantId === l.variantId);
    if (!row) { missing.push(l); continue; }
    const key = `${l.slug}/${l.variantId}`;
    const prev = merged.get(key);
    merged.set(key, { row, line: prev ? { ...l, kits: prev.line.kits + l.kits } : l });
  }
  const kits = [...merged.values()].reduce((n, m) => n + m.line.kits, 0);
  const sheetPct = tierFor(kits, s.tiers).pct;
  let sheetSubtotalCents = 0;
  const items: PricedItem[] = [...merged.values()].map(({ row, line }) => {
    const listUnitCents = Math.round(row.priceUsd * 100 * KIT_VIALS);
    const unitPriceCents = Math.round(listUnitCents * (1 - line.pct / 100));
    sheetSubtotalCents += Math.round(listUnitCents * (1 - sheetPct / 100)) * line.kits;
    return {
      compoundSlug: row.slug, compoundName: row.name, chemicalClass: row.chemicalClass, variantId: row.variantId, strength: row.strength,
      packQty: KIT_VIALS, quantity: line.kits, listUnitCents, packPct: line.pct, unitPriceCents, lineTotalCents: unitPriceCents * line.kits, lotNumber: "",
    };
  });
  const subtotalCents = items.reduce((n, i) => n + i.lineTotalCents, 0);
  const shippingCents = items.length === 0 || subtotalCents >= FREE_SHIPPING_MIN_CENTS ? 0 : SHIPPING_FLAT_CENTS;
  const insuranceCents = items.length === 0 ? 0 : PROTECTION_CENTS;   // wholesale: always included
  const depositCents = Math.round(subtotalCents * s.depositPct / 100);
  const totalBeforeTaxCents = subtotalCents + shippingCents + insuranceCents;
  return { items, missing, kits, subtotalCents, shippingCents, insuranceCents, depositCents, totalBeforeTaxCents, balanceBeforeTaxCents: totalBeforeTaxCents - depositCents, sheetPct, sheetSubtotalCents };
}

// Card is never offered for an order with an incretin or amylin analog (they
// never go through Stripe; CLAUDE.md compliance rules).
export function cardAllowed(items: Array<{ chemicalClass?: string | null }>): boolean {
  return !items.some((i) => i.chemicalClass === GLP_CLASS);
}

// The kits a volume-quote inquiry asked for: lines written by volumeQuoteMessage
// ("- SS-31 (Elamipretide) 50 mg: 20 kits"). Lines that match no strength on the
// store come back in `unmatched` for the owner to add by hand. Every line starts at the band
// for the request's total kits (unmatched lines count too).
export function parseQuoteRequest(message: string, rows: KitRow[]): { lines: QuoteLine[]; unmatched: string[] } {
  const lines: QuoteLine[] = [];
  const unmatched: string[] = [];
  let total = 0;
  for (const raw of message.split(/\r?\n/)) {
    const m = /^\s*[-–•]\s*(.+?):\s*(\d+)\s*kits?\s*$/i.exec(raw);
    if (!m) continue;
    const label = m[1].trim().toLowerCase();
    const row = rows.find((r) => `${r.name} ${r.strength}`.toLowerCase() === label);
    const kits = Math.min(MAX_KITS_PER_LINE, Number(m[2]));
    total += kits;
    if (row && kits > 0) lines.push({ slug: row.slug, variantId: row.variantId, kits, pct: 0 });
    else unmatched.push(m[1].trim());
  }
  const pct = quoteStartPct(total);
  return { lines: lines.map((l) => ({ ...l, pct })), unmatched };
}

// A deposit that lands after the order's run closed joins the run open that day.
export function depositCutoff(orderCutoff: string, today: string, s: { runDays: number; override: string | null }): string {
  return orderCutoff >= today ? orderCutoff : cutoffFor(today, s);
}

// The pay link works through the "valid until" shop date.
export function quoteOpen(o: { status: string; quote_valid_until: string | null }, today: string): boolean {
  return o.status === "quoted" && !!o.quote_valid_until && today <= o.quote_valid_until;
}

// ---------- the create form (Admin → Orders → New quote order) ----------
export type QuoteForm = {
  customerId: string; inquiryId: string | null; lines: QuoteLine[]; cutoffOn: string; depositPct: number;
  validUntil: string; payBank: boolean; payCard: boolean; note: string | null;
};
type Get = (k: string) => string | null;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseQuoteForm(get: Get, today: string, opts: { bankReady: boolean; cutoffs: string[] }): { ok: true; value: QuoteForm } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const customerId = (get("customerId") ?? "").trim();
  if (!UUID.test(customerId)) errors.customer = "Pick the customer.";
  const inq = (get("inquiryId") ?? "").trim();
  const inquiryId = UUID.test(inq) ? inq : null;
  const n = Math.min(60, Math.max(0, Number(get("lineCount") ?? 0) || 0));
  const lines: QuoteLine[] = [];
  for (let i = 0; i < n; i++) {
    const slug = (get(`slug${i}`) ?? "").trim();
    const variantId = (get(`variant${i}`) ?? "").trim();
    if (!slug || !variantId) continue;
    const kits = Number((get(`kits${i}`) ?? "").trim());
    const pct = Number((get(`pct${i}`) ?? "").trim());
    if (!Number.isInteger(kits) || kits < 1 || kits > MAX_KITS_PER_LINE) { errors[`kits${i}`] = `1 to ${MAX_KITS_PER_LINE} kits.`; continue; }
    if (!Number.isFinite(pct) || pct <= 0 || pct > QUOTE_MAX_PCT || Math.round(pct * 10) !== pct * 10) { errors[`pct${i}`] = `Up to ${QUOTE_MAX_PCT}% off retail.`; continue; }
    lines.push({ slug, variantId, kits, pct });
  }
  if (lines.length === 0 && !Object.keys(errors).some((k) => k.startsWith("kits") || k.startsWith("pct"))) errors.lines = "Add at least one strength.";
  const cutoffOn = (get("cutoffOn") ?? "").trim();
  if (!opts.cutoffs.includes(cutoffOn)) errors.cutoffOn = "Pick a run.";
  const depositPct = Number((get("depositPct") ?? "").trim());
  if (!Number.isInteger(depositPct) || depositPct < 10 || depositPct > 90) errors.depositPct = "10 to 90%.";
  const validUntil = (get("validUntil") ?? "").trim();
  if (!DATE.test(validUntil) || validUntil < today || validUntil > addDays(today, QUOTE_MAX_VALID_DAYS)) errors.validUntil = `A date from today to ${QUOTE_MAX_VALID_DAYS} days out.`;
  const payBank = get("payBank") === "on";
  const payCard = get("payCard") === "on";
  if (payBank && !opts.bankReady) errors.pay = "Add the bank details in Wholesale → Settings first, or offer card only.";
  else if (!payBank && !payCard) errors.pay = "Offer at least one way to pay.";
  const note = (get("note") ?? "").trim();
  if (note.length > QUOTE_NOTE_MAX) errors.note = `Up to ${QUOTE_NOTE_MAX} characters.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { customerId, inquiryId, lines, cutoffOn, depositPct, validUntil, payBank, payCard, note: note || null } };
}

// ---------- bank details (Admin → Wholesale → Settings) ----------
export type BankDetails = { accountName: string; bankName: string; routing: string; account: string; note: string | null };

// Bank transfer can be offered only when all four main fields are set.
export function bankReady(b: Partial<BankDetails> | null): b is BankDetails {
  return !!b && !!b.accountName && !!b.bankName && !!b.routing && !!b.account;
}

// Empty fields clear the details (bank transfer then can't be offered).
export function parseBankForm(get: Get): { ok: true; value: BankDetails | null } | { ok: false; errors: Record<string, string> } {
  const v = (k: string) => (get(k) ?? "").trim();
  const accountName = v("bankAccountName"), bankName = v("bankName");
  const routing = v("bankRouting").replace(/\s/g, ""), account = v("bankAccount").replace(/\s/g, "");
  const note = v("bankNote");
  if (!accountName && !bankName && !routing && !account && !note) return { ok: true, value: null };
  const errors: Record<string, string> = {};
  if (!accountName || accountName.length > 120) errors.bankAccountName = "The name on the account.";
  if (!bankName || bankName.length > 120) errors.bankName = "The bank's name.";
  if (!/^\d{9}$/.test(routing)) errors.bankRouting = "9 digits.";
  if (!/^\d{4,17}$/.test(account)) errors.bankAccount = "4 to 17 digits.";
  if (note.length > 300) errors.bankNote = "Up to 300 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { accountName, bankName, routing, account, note: note || null } };
}

// ---------- recording a transfer (owner) ----------
export type TransferForm = { payment: "deposit" | "balance"; amountCents: number; receivedOn: string; reference: string | null };

export function parseTransferForm(get: Get, today: string): { ok: true; value: TransferForm } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const payment = get("payment");
  if (payment !== "deposit" && payment !== "balance") errors.payment = "Deposit or balance?";
  const amount = Number((get("amount") ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Enter the amount that arrived.";
  const receivedOn = (get("receivedOn") ?? "").trim();
  if (!DATE.test(receivedOn) || receivedOn > today || receivedOn < addDays(today, -90)) errors.receivedOn = "The day it arrived (not in the future).";
  const reference = (get("reference") ?? "").trim();
  if (reference.length > BANK_REF_MAX) errors.reference = `Up to ${BANK_REF_MAX} characters.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { payment: payment as "deposit" | "balance", amountCents: Math.round(amount * 100), receivedOn, reference: reference || null } };
}

// ---------- the owner's profit estimate on the create form ----------
// Per strength: one kit's cost (cheapest supplier box + inbound, labels, kit box)
// and the lab test (the whole test, as if this order were alone in its run).
// Card fees only when card is offered; a bank transfer costs nothing.
export type KitCost = { kitCents: number; labCents: number };
export function estimateQuoteProfit(items: Array<{ compoundSlug: string; variantId: string; quantity: number; lineTotalCents: number; compoundName: string; strength: string }>,
  costs: Record<string, KitCost | undefined>, totalCents: number, opts: { card: boolean; cardPct: number; cardFixedCents: number; charges: number }) {
  let productCents = 0, labCents = 0;
  const missing: string[] = [];
  for (const i of items) {
    const c = costs[`${i.compoundSlug}/${i.variantId}`];
    if (!c) { missing.push(`${i.compoundName} ${i.strength}`); continue; }
    productCents += c.kitCents * i.quantity;
    labCents += c.labCents;
  }
  const goods = items.reduce((n, i) => n + i.lineTotalCents, 0);
  const feeCents = opts.card ? Math.round(totalCents * opts.cardPct) + opts.cardFixedCents * opts.charges : 0;
  const profitCents = goods - productCents - labCents - feeCents;
  return { goodsCents: goods, productCents, labCents, feeCents, profitCents, marginPct: goods > 0 ? Math.round((profitCents / goods) * 100) : null, missing };
}

// The runs a quote order can join: the one open today and the next two.
export function quoteCutoffChoices(today: string, s: { runDays: number; nextCutoffOverride: string | null; leadDays: number }): Array<{ cutoffOn: string; testedAbout: string; shipsAbout: string }> {
  const first = cutoffFor(today, { runDays: s.runDays, override: s.nextCutoffOverride });
  return [0, 1, 2].map((k) => {
    const cutoffOn = addDays(first, k * s.runDays);
    const d = estimatedDates(cutoffOn, s.leadDays);
    return { cutoffOn, ...d };
  });
}

// ---------- quote requests (quote-requests.sql) ----------
// A volume-quote request is an order from the moment it's sent: status
// quote_requested, the kits the buyer asked for, no prices. The owner prices the
// same order within QUOTE_REPLY_HOURS.
export const QUOTE_REQUEST_LINES_MAX = 60;

// Due = 12 business hours after the request, counting only Mon–Fri 9–5 Mountain
// (3 pm Monday → 11 am Wednesday; Friday afternoon → Tuesday).
const SHOP_TZ = "America/Denver";
const mtParts = (ms: number) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(ms)).filter((x) => x.type !== "literal").map((x) => [x.type, Number(x.value)]));
  return { y: p.year, m: p.month, d: p.day, min: p.hour * 60 + p.minute };
};
// Mountain wall time → UTC ms (correct across DST: the offset is re-read at the guess).
function mtToUtc(y: number, m: number, d: number, minutes: number): number {
  let t = Date.UTC(y, m - 1, d, 0, minutes);
  for (let i = 0; i < 2; i++) {
    const p = mtParts(t);
    t += Date.UTC(y, m - 1, d, 0, minutes) - Date.UTC(p.y, p.m - 1, p.d, 0, p.min);
  }
  return t;
}
export function quotePriceBy(createdAtIso: string): number {
  const open = QUOTE_BUSINESS_DAY.startHour * 60, close = QUOTE_BUSINESS_DAY.endHour * 60;
  const start = mtParts(Date.parse(createdAtIso));
  let day = Date.UTC(start.y, start.m - 1, start.d);   // the Mountain calendar date, as UTC midnight
  let at = start.min;
  let left = QUOTE_REPLY_HOURS * 60;
  for (let guard = 0; guard < 60; guard++) {
    const wd = new Date(day).getUTCDay();
    if (wd === 0 || wd === 6 || at >= close) { day += 86_400_000; at = open; continue; }
    if (at < open) at = open;
    if (left <= close - at) {
      const d = new Date(day);
      return mtToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), at + left);
    }
    left -= close - at;
    day += 86_400_000; at = open;
  }
  throw new Error("quotePriceBy: no business hours found");
}
// "Tue, Oct 20, 1:00 pm MT" — the due time as buyers and the owner read it.
export function priceByLabel(ms: number): string {
  const s = new Date(ms).toLocaleString("en-US", { timeZone: SHOP_TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return `${s.replace(" AM", " am").replace(" PM", " pm")} MT`;
}
// An unpriced request closes QUOTE_REQUEST_EXPIRE_HOURS after it was due.
export const quoteRequestExpiresAt = (createdAtIso: string): number => quotePriceBy(createdAtIso) + QUOTE_REQUEST_EXPIRE_HOURS * 3_600_000;

// The lines a request may be made from: whole kits of strengths offered as kits,
// at least VOLUME_QUOTE_MIN_KITS in all (below that the order sheet prices them).
export function requestLinesOk(lines: Array<{ slug: string; variantId: string; kits: number }>, rows: KitRow[]):
  { ok: true; lines: QuoteLine[]; kits: number } | { ok: false; reason: string } {
  if (lines.length === 0 || lines.length > QUOTE_REQUEST_LINES_MAX) return { ok: false, reason: "no kits" };
  const merged = new Map<string, QuoteLine>();
  for (const l of lines) {
    if (!rows.some((r) => r.slug === l.slug && r.variantId === l.variantId)) return { ok: false, reason: `${l.slug} ${l.variantId} isn't offered as a kit` };
    if (!Number.isInteger(l.kits) || l.kits < 1) return { ok: false, reason: "bad kit count" };
    const k = `${l.slug}/${l.variantId}`;
    const kits = (merged.get(k)?.kits ?? 0) + l.kits;
    if (kits > MAX_KITS_PER_LINE) return { ok: false, reason: "too many kits on one line" };
    merged.set(k, { slug: l.slug, variantId: l.variantId, kits, pct: 0 });
  }
  const out = [...merged.values()];
  const kits = out.reduce((n, l) => n + l.kits, 0);
  if (kits < VOLUME_QUOTE_MIN_KITS) return { ok: false, reason: `under ${VOLUME_QUOTE_MIN_KITS} kits` };
  return { ok: true, lines: out, kits };
}

// The kits a closed request asked for, as the order sheet's ?kits= value
// ("bpc-157/10mg:20,tb-500/10mg:12"); the sheet reads it back with parseSheetKits.
export function sheetKitsParam(items: Array<{ compound_slug: string; variant_id: string; quantity: number }>): string {
  return items.map((i) => `${i.compound_slug}/${i.variant_id}:${i.quantity}`).join(",");
}
export function parseSheetKits(v: string | undefined, rows: Array<{ slug: string; variantId: string }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of (v ?? "").split(",").slice(0, QUOTE_REQUEST_LINES_MAX)) {
    const m = /^([a-z0-9-]+)\/([a-z0-9.-]+):(\d{1,3})$/i.exec(part.trim());
    if (!m) continue;
    const kits = Math.min(MAX_KITS_PER_LINE, Number(m[3]));
    if (kits > 0 && rows.some((r) => r.slug === m[1] && r.variantId === m[2])) out[`${m[1]}/${m[2]}`] = kits;
  }
  return out;
}
