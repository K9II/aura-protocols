import { describe, it, expect } from "vitest";
import { batchStatus, buildListRows } from "@/lib/discounts/list";
import type { DiscountCodeRow } from "@/lib/discounts/rules";

const base: DiscountCodeRow = {
  id: "c1", code: "SPRING20", note: null, kind: "order_pct", value: 20, stack_on_top: true, free_shipping: true, starts_at: null, ends_at: "2026-11-01T05:59:00Z",
  max_uses: 200, once_per_customer: true, locked_email: null, min_order_cents: null, include_slugs: [], exclude_slugs: [], include_classes: [], exclude_classes: [],
  status: "active", batch_id: null, created_by: null, created_at: "2026-09-27T00:00:00Z",
};
const NOW = Date.parse("2026-10-04T12:00:00Z");

describe("buildListRows", () => {
  it("one row per single code, one row per batch with summed uses", () => {
    const codes = [base, { ...base, id: "b-1", code: "VIP-OCT-AAAAA", kind: "item_pct" as const, value: 25, max_uses: 1, batch_id: "b1" }, { ...base, id: "b-2", code: "VIP-OCT-BBBBB", kind: "item_pct" as const, value: 25, max_uses: 1, batch_id: "b1" }];
    const stats = new Map([["c1", { uses: 38, held: 1, revenueCents: 624000, discountCents: 110800, cappedOrders: 4 }], ["b-1", { uses: 1, held: 0, revenueCents: 22000, discountCents: 5500, cappedOrders: 0 }]]);
    const rows = buildListRows(codes, [{ id: "b1", prefix: "VIP-OCT-", size: 2, note: null, created_at: "" }], stats, NOW);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.batchId === "b1")).toMatchObject({ code: "VIP-OCT-·····", uses: 1, max: 2, href: "/admin/discounts/batch/b1", sub: "Batch · 2 single-use codes", status: "active" });
    expect(rows.find((r) => r.id === "c1")).toMatchObject({ uses: 38, max: 200, revenueCents: 624000, status: "active", gives: "20% off order, on top + free shipping" });
  });

  it("a fully-redeemed batch past its end date (or ended by the owner) reads as ended, not used up", () => {
    const pastEnds = "2026-09-01T00:00:00Z"; // before NOW
    const fullOne = { uses: 1, held: 0, revenueCents: 0, discountCents: 0, cappedOrders: 0 };
    const expired = buildListRows([
      { ...base, id: "b-1", code: "A", max_uses: 1, batch_id: "bx", ends_at: pastEnds },
      { ...base, id: "b-2", code: "B", max_uses: 1, batch_id: "bx", ends_at: pastEnds },
    ], [{ id: "bx", prefix: "X-", size: 2, note: null, created_at: "" }], new Map([["b-1", fullOne], ["b-2", fullOne]]), NOW);
    expect(expired[0]).toMatchObject({ status: "ended" });

    const ownerEnded = buildListRows([
      { ...base, id: "b-3", code: "C", max_uses: 1, batch_id: "by", status: "ended" },
      { ...base, id: "b-4", code: "D", max_uses: 1, batch_id: "by", status: "ended" },
    ], [{ id: "by", prefix: "Y-", size: 2, note: null, created_at: "" }], new Map([["b-3", fullOne], ["b-4", fullOne]]), NOW);
    expect(ownerEnded[0]).toMatchObject({ status: "ended" });
  });

  it("sorts by status (active, scheduled, paused, used up, ended), then end date", () => {
    const rows = buildListRows([
      { ...base, id: "e", status: "ended" }, { ...base, id: "p", status: "paused" }, { ...base, id: "a2", ends_at: "2026-12-31T00:00:00Z" }, { ...base, id: "a1" },
    ], [], new Map(), NOW);
    expect(rows.map((r) => r.id)).toEqual(["a1", "a2", "p", "e"]);
  });
});

describe("batchStatus", () => {
  const row = { status: "active" as const, starts_at: null, ends_at: "2026-11-01T05:59:00Z", max_uses: 1 };
  it("ended beats used up: fully used AND past its end reads as ended", () => {
    expect(batchStatus([{ row: { ...row, ends_at: "2026-09-01T00:00:00Z" }, uses: 1 }, { row: { ...row, ends_at: "2026-09-01T00:00:00Z" }, uses: 1 }], 2, NOW)).toBe("ended");
    expect(batchStatus([{ row: { ...row, status: "ended" as const }, uses: 1 }, { row: { ...row, status: "ended" as const }, uses: 1 }], 2, NOW)).toBe("ended");
  });
  it("used up when every code is held or used, active while one is open, paused when paused", () => {
    expect(batchStatus([{ row, uses: 1 }, { row, uses: 1 }], 2, NOW)).toBe("used_up");
    expect(batchStatus([{ row, uses: 1 }, { row, uses: 0 }], 2, NOW)).toBe("active");
    expect(batchStatus([{ row: { ...row, status: "paused" as const }, uses: 0 }], 1 + 1, NOW)).toBe("paused");
  });
});
