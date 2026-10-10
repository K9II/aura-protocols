import { describe, it, expect } from "vitest";
import { REVIEW_WARN_DAYS, reviewLines, type UnreviewedOrder } from "@/lib/wholesale/review";

const o = (x: Partial<UnreviewedOrder> = {}): UnreviewedOrder => ({
  orderId: "o1", orderNumber: "AP-1052", customerId: "c1", name: "Dana Reyes", organization: "Reyes Lab", email: "dana@reyeslab.org",
  field: "pharmacology", depositCents: 124000, kits: 6, cutoffOn: "2026-10-19", ...x,
});

describe("reviewLines", () => {
  it("one line per buyer: orders, kits and deposits added up, earliest order-by kept", () => {
    const lines = reviewLines([o(), o({ orderId: "o2", orderNumber: "AP-1060", kits: 5, depositCents: 100000, cutoffOn: "2026-11-02" })], "2026-10-10");
    expect(lines).toEqual([{ customerId: "c1", name: "Dana Reyes", organization: "Reyes Lab", email: "dana@reyeslab.org", field: "pharmacology",
      orders: ["AP-1052", "AP-1060"], kits: 11, depositCents: 224000, cutoffOn: "2026-10-19", red: false }]);
  });

  it(`red from ${REVIEW_WARN_DAYS} days before the order-by date, and after it`, () => {
    expect(REVIEW_WARN_DAYS).toBe(2);
    const red = (today: string) => reviewLines([o()], today)[0].red;
    expect([red("2026-10-16"), red("2026-10-17"), red("2026-10-19"), red("2026-10-22")]).toEqual([false, true, true, true]);
  });

  it("sorts by earliest order-by date, then name", () => {
    const lines = reviewLines([
      o({ customerId: "c2", name: "Zed", cutoffOn: "2026-10-19" }),
      o({ customerId: "c3", name: "Amy", cutoffOn: "2026-10-19" }),
      o({ customerId: "c4", name: "Bo", cutoffOn: "2026-10-05" }),
    ], "2026-10-01");
    expect(lines.map((l) => l.name)).toEqual(["Bo", "Amy", "Zed"]);
  });

  it("no orders, no lines", () => {
    expect(reviewLines([], "2026-10-10")).toEqual([]);
  });
});
