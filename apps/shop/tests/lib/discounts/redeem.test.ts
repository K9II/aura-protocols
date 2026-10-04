import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DiscountCodeRow } from "@/lib/discounts/rules";

const findCodeByText = vi.fn();
const useCounts = vi.fn();
vi.mock("@/lib/discounts/data", () => ({ findCodeByText, useCounts }));

const row: DiscountCodeRow = {
  id: "c1", code: "SPRING20", note: null, kind: "order_pct", value: 20, stack_on_top: true, free_shipping: true,
  starts_at: "2026-09-28T06:00:00Z", ends_at: "2026-11-01T05:59:00Z", max_uses: 200, once_per_customer: true, locked_email: null,
  min_order_cents: 15000, include_slugs: [], exclude_slugs: [], include_classes: [], exclude_classes: [],
  status: "active", batch_id: null, created_by: null, created_at: "2026-09-27T00:00:00Z",
};
const me = { id: "u1", email: "j@lab.org" };
const NOW = Date.parse("2026-10-04T12:00:00Z");

describe("lookupDiscountCode", () => {
  beforeEach(() => { vi.resetModules(); findCodeByText.mockReset(); useCounts.mockReset(); useCounts.mockResolvedValue({ total: 3, mine: 0 }); });

  it("none when no discount code has that text (partner path continues)", async () => {
    findCodeByText.mockResolvedValue(null);
    const { lookupDiscountCode } = await import("@/lib/discounts/redeem");
    expect(await lookupDiscountCode("SMITHLAB", me, NOW)).toEqual({ kind: "none" });
  });

  it("returns the code's terms when it can be used", async () => {
    findCodeByText.mockResolvedValue(row);
    const { lookupDiscountCode } = await import("@/lib/discounts/redeem");
    const r = await lookupDiscountCode("spring20", me, NOW);
    expect(r).toMatchObject({ kind: "discount", id: "c1", code: "SPRING20", terms: { kind: "order_pct", value: 20 } });
  });

  it.each([
    [{ status: "paused" as const }, { total: 0, mine: 0 }, "This code can't be used."],
    [{ ends_at: "2026-10-01T05:59:00Z" }, { total: 0, mine: 0 }, "This code ended on Sep 30."],
    [{ starts_at: "2026-11-27T07:00:00Z" }, { total: 0, mine: 0 }, "This code isn't active yet."],
    [{}, { total: 200, mine: 0 }, "This code has reached its limit."],
    [{}, { total: 3, mine: 1 }, "You've already used this code."],
    [{ locked_email: "p@meridian.edu" }, { total: 0, mine: 0 }, "This code isn't valid for the email on your account."],
  ])("refuses %o", async (patch, counts, message) => {
    findCodeByText.mockResolvedValue({ ...row, ...patch });
    useCounts.mockResolvedValue(counts);
    const { lookupDiscountCode } = await import("@/lib/discounts/redeem");
    expect(await lookupDiscountCode("SPRING20", me, NOW)).toEqual({ kind: "error", message });
  });

  it("an email lock matches case-insensitively", async () => {
    findCodeByText.mockResolvedValue({ ...row, locked_email: "J@Lab.org" });
    const { lookupDiscountCode } = await import("@/lib/discounts/redeem");
    expect((await lookupDiscountCode("SPRING20", me, NOW)).kind).toBe("discount");
  });
});
