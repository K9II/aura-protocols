import { describe, it, expect } from "vitest";
import { QUOTE_REQUEST_LINES_MAX, parseSheetKits, quotePriceBy, quoteRequestExpiresAt, requestLinesOk, sheetKitsParam } from "@/lib/wholesale/quote";
import { canTransition, STATUS_LABEL } from "@/lib/order-status";
import { buildOrderTimeline } from "@/lib/orders/timeline";
import { wholesaleSection } from "@/lib/today/todos";
import { TAB_STATUSES } from "@/lib/orders/tabs";
import type { KitRow } from "@/lib/wholesale/rules";

// Volume-quote requests are orders from Send (mock "Quote on the Order", Alvester 2026-10-17).
const rows: KitRow[] = [
  { slug: "bpc-157", name: "BPC-157", designation: null, chemicalClass: "Peptide Fragments", variantId: "10mg", strength: "10 mg", priceUsd: 65 },
  { slug: "tb-500", name: "TB-500", designation: null, chemicalClass: "Peptide Fragments", variantId: "10mg", strength: "10 mg", priceUsd: 90 },
];

describe("quote request rules", () => {
  it("accepts whole kits of offered strengths, 30+ in all, merging repeats", () => {
    expect(requestLinesOk([{ slug: "bpc-157", variantId: "10mg", kits: 20 }, { slug: "tb-500", variantId: "10mg", kits: 6 }, { slug: "bpc-157", variantId: "10mg", kits: 4 }], rows))
      .toEqual({ ok: true, kits: 30, lines: [{ slug: "bpc-157", variantId: "10mg", kits: 24, pct: 0 }, { slug: "tb-500", variantId: "10mg", kits: 6, pct: 0 }] });
  });
  it("refuses under 30 kits, unknown strengths, bad counts, too many lines", () => {
    expect(requestLinesOk([{ slug: "bpc-157", variantId: "10mg", kits: 29 }], rows)).toEqual({ ok: false, reason: "under 30 kits" });
    expect(requestLinesOk([{ slug: "nope", variantId: "1mg", kits: 40 }], rows).ok).toBe(false);
    expect(requestLinesOk([{ slug: "bpc-157", variantId: "10mg", kits: 0 }], rows).ok).toBe(false);
    expect(requestLinesOk([{ slug: "bpc-157", variantId: "10mg", kits: 51 }], rows).ok).toBe(false);
    expect(requestLinesOk([], rows).ok).toBe(false);
    expect(requestLinesOk(Array.from({ length: QUOTE_REQUEST_LINES_MAX + 1 }, () => ({ slug: "bpc-157", variantId: "10mg", kits: 1 })), rows).ok).toBe(false);
  });
  // 12 business hours: Mon–Fri 9–5 Mountain (Alvester 2026-10-17). MDT = UTC−6 until Nov 1 2026, MST = UTC−7 after.
  it("is due 12 business hours after the request (Mon–Fri 9–5 Mountain)", () => {
    expect(quotePriceBy("2026-10-19T21:00:00Z")).toBe(Date.parse("2026-10-21T17:00:00Z"));   // Mon 3 pm → Wed 11 am
    expect(quotePriceBy("2026-10-20T13:00:00Z")).toBe(Date.parse("2026-10-21T19:00:00Z"));   // Tue 7 am (before opening) → Wed 1 pm
    expect(quotePriceBy("2026-10-17T19:18:00Z")).toBe(Date.parse("2026-10-20T19:00:00Z"));   // Sat → counts from Mon 9 am → Tue 1 pm
    expect(quotePriceBy("2026-10-23T21:00:00Z")).toBe(Date.parse("2026-10-27T17:00:00Z"));   // Fri 3 pm → Tue 11 am
    expect(quotePriceBy("2026-10-19T23:30:00Z")).toBe(Date.parse("2026-10-21T19:00:00Z"));   // Mon 5:30 pm (after close) → Wed 1 pm
  });
  it("keeps the wall-clock time across the switch back to standard time", () => {
    expect(quotePriceBy("2026-10-30T21:00:00Z")).toBe(Date.parse("2026-11-03T18:00:00Z"));   // Fri 3 pm MDT → Tue 11 am MST
  });
  it("closes an unpriced request 48 hours after it was due", () => {
    expect(quoteRequestExpiresAt("2026-10-19T21:00:00Z")).toBe(Date.parse("2026-10-23T17:00:00Z"));
  });
  it("hands a closed request's kits to the order sheet and reads them back (unknown strengths dropped)", () => {
    const param = sheetKitsParam([{ compound_slug: "bpc-157", variant_id: "10mg", quantity: 22 }, { compound_slug: "tb-500", variant_id: "10mg", quantity: 8 }]);
    expect(param).toBe("bpc-157/10mg:22,tb-500/10mg:8");
    expect(parseSheetKits(`${param},nope/1mg:3,bad`, rows)).toEqual({ "bpc-157/10mg": 22, "tb-500/10mg": 8 });
    expect(parseSheetKits(undefined, rows)).toEqual({});
  });
});

describe("quote_requested status", () => {
  it("is priced (→ quoted) or closed (→ cancelled), nothing else", () => {
    expect(canTransition("quote_requested", "quoted")).toBe(true);
    expect(canTransition("quote_requested", "cancelled")).toBe(true);
    expect(canTransition("quote_requested", "deposit_paid")).toBe(false);
    expect(canTransition("quote_requested", "paid")).toBe(false);
    expect(STATUS_LABEL.quote_requested).toBe("Quote requested");
    expect(TAB_STATUSES.wholesale).toContain("quote_requested");
  });
});

describe("timeline of a request", () => {
  const base = { id: "o1", created_at: "2026-10-17T17:39:00Z", paid_at: null, shipped_at: null, cancelled_at: null, refunded_at: null, carrier: null, tracking_number: null, stripe_payment_intent: null, store_credit_cents: 0, total_cents: 0, channel: "wholesale" };
  const src = { adminEvents: [] as Array<{ action: string; at: string; actorName: string | null; detail: string | null }>, commission: null, disputes: [], warnings: [], inquiries: [] };
  const titles = (t: ReturnType<typeof buildOrderTimeline>) => t.map((e) => e.title);
  it("open: Quote requested", () => {
    expect(titles(buildOrderTimeline({ ...src, order: { ...base, status: "quote_requested" } }))).toEqual(["Quote requested"]);
  });
  it("priced: Quote requested, then Priced by the owner", () => {
    const t = buildOrderTimeline({ ...src, adminEvents: [{ action: "quote_priced", at: "2026-10-17T20:00:00Z", actorName: "Alvester", detail: "61 kits · $47,580.50 before tax · email: sent" }],
      order: { ...base, status: "quoted", quote_valid_until: "2026-10-31", quote_priced_at: "2026-10-17T20:00:00Z" } });
    expect(titles(t)).toEqual(["Priced", "Quote requested"]);
    expect(t[0].who).toBe("Alvester");
  });
  it("closed: says who closed it and why", () => {
    const at = "2026-10-17T19:00:00Z";
    expect(titles(buildOrderTimeline({ ...src, order: { ...base, status: "cancelled", cancelled_at: at, quote_closed_reason: "ordered_now" } }))[0]).toBe("Request closed · buyer ordered at the sheet price");
    expect(titles(buildOrderTimeline({ ...src, order: { ...base, status: "cancelled", cancelled_at: at, quote_closed_reason: "customer_cancelled" } }))[0]).toBe("Request cancelled by the buyer");
  });
});

describe("Today: quotes to price", () => {
  const empty = { collecting: null, toOrder: [], failed: [], balances: { due: 0, overdue: 0 }, newBuyers: [] };
  it("lists each request with its 12-hour clock: amber before, red once late; each counts", () => {
    const now = Date.parse("2026-10-17T20:00:00Z");
    const s = wholesaleSection({ ...empty, nowMs: now, quoteRequests: [
      { id: "a", number: "AP-1063", name: "Dana Reyes", kits: 61, priceBy: Date.parse("2026-10-17T19:00:00Z") },
      { id: "b", number: "AP-1064", name: "Sam Lee", kits: 30, priceBy: Date.parse("2026-10-18T05:00:00Z") },
    ] })!;
    expect(s.n).toBe(2);
    expect(s.tone).toBe("red");
    expect(s.lines.map((l) => [l.mono, l.tone, l.title, l.age?.late])).toEqual([
      ["AP-1063", "red", "Quote to price · Dana Reyes", true],
      ["AP-1064", "amb", "Quote to price · Sam Lee", false],
    ]);
    expect(s!.lines[0].action).toEqual({ label: "Price it", href: "/admin/orders/new-quote?order=AP-1063" });
  });
});
