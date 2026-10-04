import { describe, it, expect } from "vitest";
import {
  codeStatus, customerSummary, describeRule, generateBatchCodes, normalizeAdminCode, normalizePrefix,
  ruleSentence, termsFromRow, validateAdminCode, type CodeTerms, type DiscountCodeRow,
} from "@/lib/discounts/rules";

const row: DiscountCodeRow = {
  id: "c1", code: "SPRING20", note: "Spring email list", kind: "order_pct", value: 20, stack_on_top: true, free_shipping: true,
  starts_at: "2026-09-28T06:00:00Z", ends_at: "2026-11-01T05:59:00Z", max_uses: 200, once_per_customer: true, locked_email: null,
  min_order_cents: 15000, include_slugs: [], exclude_slugs: ["nad-plus"], include_classes: [], exclude_classes: ["Blends"],
  status: "active", batch_id: null, created_by: null, created_at: "2026-09-27T00:00:00Z",
};
const terms: CodeTerms = termsFromRow(row);
const NOW = Date.parse("2026-10-04T12:00:00Z");

describe("admin code text", () => {
  it("normalizes and validates: letters, digits, dashes, 3–24, no edge dashes", () => {
    expect(normalizeAdminCode(" spring 20 ")).toBe("SPRING20");
    expect(validateAdminCode("vip-oct-7kq2m")).toEqual({ ok: true, code: "VIP-OCT-7KQ2M" });
    expect(validateAdminCode("FREESHIP")).toEqual({ ok: true, code: "FREESHIP" });
    expect(validateAdminCode("AB")).toEqual({ ok: false, reason: "length" });
    expect(validateAdminCode("-ABC")).toEqual({ ok: false, reason: "characters" });
    expect(validateAdminCode("AB_C")).toEqual({ ok: false, reason: "characters" });
    expect(validateAdminCode("A".repeat(25))).toEqual({ ok: false, reason: "length" });
  });

  it("generates unique batch codes from the prefix with no look-alike characters", () => {
    let seed = 0;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const codes = generateBatchCodes(normalizePrefix("vip-oct-"), 50, rand);
    expect(codes).toHaveLength(50);
    expect(new Set(codes).size).toBe(50);
    for (const c of codes) {
      expect(c).toMatch(/^VIP-OCT-[A-HJKMNP-Z2-9]{5}$/);
      expect(validateAdminCode(c).ok).toBe(true);
    }
  });

  it("prefix: uppercase, letters/digits/dashes only, at most 12", () => {
    expect(normalizePrefix(" vip oct- ")).toBe("VIPOCT-");
    expect(normalizePrefix("a_b-c")).toBe("AB-C");
    expect(normalizePrefix("ABCDEFGHIJKLMNOP")).toBe("ABCDEFGHIJKL");
  });
});

describe("codeStatus", () => {
  it("ended beats everything, then used up, paused, scheduled, active", () => {
    expect(codeStatus(row, 10, NOW)).toBe("active");
    expect(codeStatus({ ...row, status: "ended" }, 10, NOW)).toBe("ended");
    expect(codeStatus({ ...row, ends_at: "2026-10-01T00:00:00Z" }, 10, NOW)).toBe("ended");
    expect(codeStatus(row, 200, NOW)).toBe("used_up");
    expect(codeStatus({ ...row, status: "paused" }, 10, NOW)).toBe("paused");
    expect(codeStatus({ ...row, starts_at: "2026-11-27T07:00:00Z" }, 0, NOW)).toBe("scheduled");
    expect(codeStatus({ ...row, max_uses: null }, 9999, NOW)).toBe("active");
  });
});

describe("plain-English rules", () => {
  it("describes what a code gives (admin list)", () => {
    expect(describeRule(terms)).toBe("20% off order, stacks + free shipping");
    expect(describeRule({ ...terms, kind: "item_pct", value: 15, stackOnTop: false, freeShipping: false })).toBe("15% off items");
    expect(describeRule({ ...terms, kind: "order_amount", value: 1000, stackOnTop: false, freeShipping: false })).toBe("$10 off order");
    expect(describeRule({ ...terms, kind: "ship_only", value: 0 })).toBe("Free shipping");
    expect(describeRule({ ...terms, kind: "item_pct", value: 10, stackOnTop: false, freeShipping: false, includeClasses: ["Cofactors & Conjugates"], excludeClasses: [], excludeSlugs: [] }))
      .toBe("10% off Cofactors & Conjugates");
  });

  it("summarises for customers", () => {
    expect(customerSummary(terms)).toBe("20% off your order and free shipping");
    expect(customerSummary({ ...terms, kind: "item_pct", value: 25, freeShipping: false })).toBe("25% off items");
    expect(customerSummary({ ...terms, kind: "order_amount", value: 1050, freeShipping: false })).toBe("$10.50 off your order");
    expect(customerSummary({ ...terms, kind: "ship_only" })).toBe("free shipping");
  });

  it("writes the form's summary sentence", () => {
    const nameOf = (slug: string) => (slug === "nad-plus" ? "NAD+" : slug);
    expect(ruleSentence("SPRING20", terms, nameOf)).toBe(
      "SPRING20 takes 20% off the goods total after pack, new-account and partner discounts, and adds free shipping. Orders of $150 or more. Not on Blends or NAD+.",
    );
    expect(ruleSentence("WELCOMEBACK", { ...terms, kind: "item_pct", value: 15, freeShipping: false, minOrderCents: null, excludeClasses: [], excludeSlugs: [] }, nameOf))
      .toBe("WELCOMEBACK takes 15% off each item, unless its pack price or another discount is already larger.");
    expect(ruleSentence("SORRY10", { ...terms, kind: "order_amount", value: 1000, stackOnTop: false, freeShipping: false, minOrderCents: null, excludeClasses: [], excludeSlugs: [] }, nameOf))
      .toBe("SORRY10 takes $10 off the goods total, or keeps the item discounts if they save more.");
  });
});
