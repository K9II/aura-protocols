import { describe, it, expect } from "vitest";
import { CLAIM_MESSAGE, CODE_MESSAGES, outcomeMessage } from "@/lib/discounts/messages";
import type { CodeTerms } from "@/lib/discounts/rules";
import { OFFER_PCT_TEXT } from "@/lib/account/offer";

const terms: CodeTerms = { kind: "order_pct", value: 20, stackOnTop: true, freeShipping: true, minOrderCents: 15000, includeSlugs: [], excludeSlugs: [], includeClasses: [], excludeClasses: [] };
const base = { codeOutcome: "applied" as const, cappedCents: 0, codeDiscountCents: 3382, shortOfMinCents: 0, newAccount: false };

describe("outcomeMessage", () => {
  it("applied", () => {
    expect(outcomeMessage(base, "SPRING20", terms, 30)).toEqual({ tone: "good", text: "SPRING20 applied — 20% off your order and free shipping." });
  });
  it("capped", () => {
    expect(outcomeMessage({ ...base, cappedCents: 4740, codeDiscountCents: 7900 }, "SPRING20", terms, 30))
      .toEqual({ tone: "note", text: "SPRING20 applied. Your discounts are capped at 30% of list price, so SPRING20 saves $79.00 here." });
  });
  it("bigger discount wins", () => {
    expect(outcomeMessage({ ...base, codeOutcome: "no_gain", newAccount: true }, "X", terms, 30))
      .toEqual({ tone: "note", text: `Your new-account ${OFFER_PCT_TEXT} is already larger than this code on these items, so we kept it.` });
    expect(outcomeMessage({ ...base, codeOutcome: "no_gain" }, "X", terms, 30))
      .toEqual({ tone: "note", text: "A larger discount already applies to these items, so this code isn't used." });
  });
  it("a free-shipping code on an order that already ships free", () => {
    expect(outcomeMessage({ ...base, codeOutcome: "no_gain" }, "FREESHIP", { ...terms, kind: "ship_only" }, 30))
      .toEqual({ tone: "note", text: "Shipping is already free on this order, so this code isn't needed." });
  });
  it("below minimum and excluded items", () => {
    expect(outcomeMessage({ ...base, codeOutcome: "below_min", shortOfMinCents: 3420 }, "X", terms, 30))
      .toEqual({ tone: "bad", text: "Add $34.20 more to use this code (minimum $150.00 after your other discounts)." });
    expect(outcomeMessage({ ...base, codeOutcome: "no_eligible_items" }, "X", terms, 30))
      .toEqual({ tone: "bad", text: "This code doesn't apply to the items in your cart." });
  });
  it("no code → no message", () => {
    expect(outcomeMessage({ ...base, codeOutcome: null }, "X", terms, 30)).toBeNull();
  });
});

describe("fixed messages", () => {
  it("cover every claim failure", () => {
    expect(CLAIM_MESSAGE.used_up).toBe(CODE_MESSAGES.usedUp);
    expect(CLAIM_MESSAGE.already_used).toBe(CODE_MESSAGES.alreadyUsed);
    expect(CLAIM_MESSAGE.inactive).toBe(CODE_MESSAGES.invalid);
    expect(CLAIM_MESSAGE.missing).toBe(CODE_MESSAGES.invalid);
    expect(CODE_MESSAGES.ended("Oct 31")).toBe("This code ended on Oct 31.");
  });
});
