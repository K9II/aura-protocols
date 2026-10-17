import { describe, it, expect } from "vitest";
import {
  QUOTE_BANDS, bankReady, cardAllowed, depositCutoff, estimateQuoteProfit, parseBankForm, parseQuoteForm, parseQuoteRequest, parseTransferForm, quoteStartPct,
  priceQuote, quoteCutoffChoices, quoteOpen,
} from "@/lib/wholesale/quote";
import { DEFAULT_TIERS, volumeQuoteMessage, type KitRow } from "@/lib/wholesale/rules";
import { canTransition } from "@/lib/order-status";

// The Q-1006 example (2026-10-16): 61 kits quoted at 45% off retail.
const ROWS: KitRow[] = [
  { slug: "ss-31", name: "SS-31 (Elamipretide)", designation: null, chemicalClass: "Mitochondrial & Metabolic", variantId: "50mg", strength: "50 mg", priceUsd: 220 },
  { slug: "mots-c", name: "MOTS-c", designation: null, chemicalClass: "Mitochondrial & Metabolic", variantId: "40mg", strength: "40 mg", priceUsd: 105 },
  { slug: "bpc-157-tb-500-blend", name: "BPC-157 / TB-500", designation: "Wolverine", chemicalClass: "Blends", variantId: "10mg", strength: "10 mg", priceUsd: 99 },
  { slug: "bpc-157-tb-500-ghk-cu", name: "BPC-157 / TB-500 / GHK-Cu", designation: "GLOW", chemicalClass: "Blends", variantId: "70mg", strength: "70 mg", priceUsd: 159 },
  { slug: "retatrutide", name: "Retatrutide", designation: null, chemicalClass: "Incretin & Amylin Analogs", variantId: "10mg", strength: "10 mg", priceUsd: 95 },
];
const Q1006 = [
  { slug: "ss-31", variantId: "50mg", kits: 20, pct: 45 }, { slug: "mots-c", variantId: "40mg", kits: 20, pct: 45 },
  { slug: "bpc-157-tb-500-blend", variantId: "10mg", kits: 1, pct: 45 }, { slug: "bpc-157-tb-500-ghk-cu", variantId: "70mg", kits: 20, pct: 45 },
];
const S = { depositPct: 40, tiers: DEFAULT_TIERS };

describe("priceQuote", () => {
  it("prices each line off retail × 10 at its own percent — the Q-1006 quote", () => {
    const q = priceQuote(Q1006, ROWS, S);
    expect(q.kits).toBe(61);
    expect(q.items.find((i) => i.compoundSlug === "ss-31")!.unitPriceCents).toBe(121000);   // $2,200 × 0.55, not 45% off the $1,320 sheet price
    expect(q.subtotalCents).toBe(5378450);
    expect(q.totalBeforeTaxCents).toBe(5379000);          // + $5.50 shipping protection, free shipping
    expect(q.depositCents).toBe(2151380);                 // 40% of the kits
    expect(q.balanceBeforeTaxCents).toBe(5379000 - 2151380);
    expect(q.sheetPct).toBe(40);
    expect(q.sheetSubtotalCents).toBe(5867400);           // what the order sheet would charge
  });
  it("lists strengths that aren't on the store instead of pricing them", () => {
    const q = priceQuote([...Q1006, { slug: "nope", variantId: "1mg", kits: 2, pct: 45 }], ROWS, S);
    expect(q.missing).toEqual([{ slug: "nope", variantId: "1mg", kits: 2, pct: 45 }]);
    expect(q.kits).toBe(61);
  });
  it("merges a strength listed twice", () => {
    const q = priceQuote([{ slug: "mots-c", variantId: "40mg", kits: 2, pct: 45 }, { slug: "mots-c", variantId: "40mg", kits: 3, pct: 45 }], ROWS, S);
    expect(q.items).toHaveLength(1);
    expect(q.items[0].quantity).toBe(5);
  });
});

describe("cardAllowed", () => {
  it("never for an incretin or amylin analog", () => {
    expect(cardAllowed(priceQuote(Q1006, ROWS, S).items)).toBe(true);
    expect(cardAllowed(priceQuote([...Q1006, { slug: "retatrutide", variantId: "10mg", kits: 5, pct: 40 }], ROWS, S).items)).toBe(false);
  });
});

describe("parseQuoteRequest", () => {
  it("reads the lines the order sheet writes into the inquiry", () => {
    const msg = volumeQuoteMessage([
      { compoundName: "SS-31 (Elamipretide)", strength: "50 mg", quantity: 20 },
      { compoundName: "BPC-157 / TB-500 / GHK-Cu", strength: "70 mg", quantity: 20 },
      { compoundName: "Mystery peptide", strength: "5 mg", quantity: 4 },
    ]);
    const r = parseQuoteRequest(msg, ROWS);
    expect(r.lines).toEqual([
      { slug: "ss-31", variantId: "50mg", kits: 20, pct: 50 },   // 44 kits asked for (the unmatched 4 count) → 30–50 band
      { slug: "bpc-157-tb-500-ghk-cu", variantId: "70mg", kits: 20, pct: 50 },
    ]);
    expect(r.unmatched).toEqual(["Mystery peptide 5 mg"]);
  });
  it("starts at 55% from 51 kits", () => {
    const msg = volumeQuoteMessage([
      { compoundName: "SS-31 (Elamipretide)", strength: "50 mg", quantity: 31 },
      { compoundName: "BPC-157 / TB-500 / GHK-Cu", strength: "70 mg", quantity: 20 },
    ]);
    expect(parseQuoteRequest(msg, ROWS).lines.map((l) => l.pct)).toEqual([55, 55]);
  });
  it("ignores text that isn't a kit line", () => {
    expect(parseQuoteRequest("Hello, can you do a better price?", ROWS)).toEqual({ lines: [], unmatched: [] });
  });
});

describe("quote bands (Alvester 2026-10-17)", () => {
  it("30–50 kits start at 50% off retail, 51+ at 55%", () => {
    expect(QUOTE_BANDS).toEqual([{ minKits: 30, pct: 50 }, { minKits: 51, pct: 55 }]);
    expect(quoteStartPct(30)).toBe(50);
    expect(quoteStartPct(50)).toBe(50);
    expect(quoteStartPct(51)).toBe(55);
    expect(quoteStartPct(400)).toBe(55);
    expect(quoteStartPct(12)).toBe(50);   // a custom request under 30 kits still starts at the first band
  });
});

describe("dates", () => {
  const s = { runDays: 14, override: null };
  it("a deposit before the order-by date keeps the run; a late one joins the run open that day", () => {
    expect(depositCutoff("2026-10-19", "2026-10-18", s)).toBe("2026-10-19");
    expect(depositCutoff("2026-10-19", "2026-10-19", s)).toBe("2026-10-19");
    expect(depositCutoff("2026-10-19", "2026-10-21", s)).toBe("2026-11-02");
  });
  it("the pay link works through the valid-until day", () => {
    expect(quoteOpen({ status: "quoted", quote_valid_until: "2026-10-30" }, "2026-10-30")).toBe(true);
    expect(quoteOpen({ status: "quoted", quote_valid_until: "2026-10-30" }, "2026-10-31")).toBe(false);
    expect(quoteOpen({ status: "deposit_paid", quote_valid_until: "2026-10-30" }, "2026-10-20")).toBe(false);
  });
  it("offers the run open today and the next two", () => {
    const c = quoteCutoffChoices("2026-10-17", { runDays: 14, nextCutoffOverride: null, leadDays: 22 });
    expect(c.map((x) => x.cutoffOn)).toEqual(["2026-10-19", "2026-11-02", "2026-11-16"]);
    expect(c[0]).toMatchObject({ testedAbout: "2026-11-05", shipsAbout: "2026-11-10" });
  });
});

describe("status machine", () => {
  it("a quote order pays straight to deposit_paid or is cancelled", () => {
    expect(canTransition("quoted", "deposit_paid")).toBe(true);
    expect(canTransition("quoted", "cancelled")).toBe(true);
    expect(canTransition("quoted", "paid")).toBe(false);
    expect(canTransition("quoted", "refunded")).toBe(false);
  });
});

const form = (o: Record<string, string>) => (k: string) => o[k] ?? null;
const CUST = "11111111-2222-4333-8444-555555555555";
const base = {
  customerId: CUST, lineCount: "1", slug0: "ss-31", variant0: "50mg", kits0: "20", pct0: "45",
  cutoffOn: "2026-10-19", depositPct: "40", validUntil: "2026-10-30", payCard: "on",
};
const OPTS = { bankReady: false, cutoffs: ["2026-10-19", "2026-11-02"] };

describe("parseQuoteForm", () => {
  it("reads a good form", () => {
    const r = parseQuoteForm(form(base), "2026-10-17", OPTS);
    expect(r.ok && r.value).toMatchObject({ customerId: CUST, lines: [{ slug: "ss-31", variantId: "50mg", kits: 20, pct: 45 }], payBank: false, payCard: true, note: null });
  });
  it("refuses bank transfer until the bank details are set, and needs one way to pay", () => {
    const r1 = parseQuoteForm(form({ ...base, payBank: "on" }), "2026-10-17", OPTS);
    expect(!r1.ok && r1.errors.pay).toMatch(/bank details/);
    const r2 = parseQuoteForm(form({ ...base, payCard: "" }), "2026-10-17", OPTS);
    expect(!r2.ok && r2.errors.pay).toMatch(/at least one/);
  });
  it("checks kits, percent, run, deposit and the valid-until date", () => {
    const r = parseQuoteForm(form({ ...base, kits0: "0", cutoffOn: "2026-12-01", depositPct: "5", validUntil: "2026-10-16" }), "2026-10-17", OPTS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["cutoffOn", "depositPct", "kits0", "validUntil"]);
    const p = parseQuoteForm(form({ ...base, pct0: "75" }), "2026-10-17", OPTS);
    expect(!p.ok && p.errors.pct0).toMatch(/70%/);
  });
});

describe("bank details", () => {
  it("needs all four main fields; empty clears them", () => {
    expect(bankReady(null)).toBe(false);
    expect(bankReady({ accountName: "Aura Protocols LLC", bankName: "Bank", routing: "123456789", account: "000123456", note: null })).toBe(true);
    expect(parseBankForm(form({}))).toEqual({ ok: true, value: null });
    const bad = parseBankForm(form({ bankAccountName: "Aura", bankName: "Bank", bankRouting: "1234", bankAccount: "12" }));
    expect(!bad.ok && Object.keys(bad.errors).sort()).toEqual(["bankAccount", "bankRouting"]);
    const ok = parseBankForm(form({ bankAccountName: "Aura Protocols LLC", bankName: "Bank", bankRouting: "123 456 789", bankAccount: "000123456" }));
    expect(ok.ok && ok.value?.routing).toBe("123456789");
  });
});

describe("parseTransferForm", () => {
  it("reads the amount, the day it arrived and the reference", () => {
    const r = parseTransferForm(form({ payment: "deposit", amount: "$21,513.80", receivedOn: "2026-10-18", reference: "WIRE 88412" }), "2026-10-18");
    expect(r.ok && r.value).toEqual({ payment: "deposit", amountCents: 2151380, receivedOn: "2026-10-18", reference: "WIRE 88412" });
  });
  it("refuses a date in the future", () => {
    const r = parseTransferForm(form({ payment: "balance", amount: "100", receivedOn: "2026-10-19" }), "2026-10-18");
    expect(!r.ok && r.errors.receivedOn).toBeTruthy();
  });
});

describe("estimateQuoteProfit", () => {
  it("leaves card fees out when only bank transfer is offered", () => {
    const q = priceQuote(Q1006, ROWS, S);
    const costs = Object.fromEntries(ROWS.map((r) => [`${r.slug}/${r.variantId}`, { kitCents: 20000, labCents: 25000 }]));
    const opts = { cardPct: 0.029, cardFixedCents: 30, charges: 2 };
    const bank = estimateQuoteProfit(q.items, costs, q.totalBeforeTaxCents, { ...opts, card: false });
    const card = estimateQuoteProfit(q.items, costs, q.totalBeforeTaxCents, { ...opts, card: true });
    expect(bank.feeCents).toBe(0);
    expect(card.feeCents).toBe(Math.round(5379000 * 0.029) + 60);
    expect(bank.productCents).toBe(61 * 20000);
    expect(bank.labCents).toBe(4 * 25000);
    expect(bank.profitCents - card.profitCents).toBe(card.feeCents);
  });
});
