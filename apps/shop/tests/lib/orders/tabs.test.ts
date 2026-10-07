import { describe, it, expect } from "vitest";
import { ORDER_TABS, TAB_STATUSES, cleanOrderSearch, itemsSummary, orderMarkers, parseOrderTab } from "@/lib/orders/tabs";

describe("order tabs", () => {
  it("maps every tab to statuses; awaiting payment is never listed", () => {
    expect(ORDER_TABS).toEqual(["to_ship", "processing", "shipped", "closed", "all"]);
    expect(TAB_STATUSES.to_ship).toEqual(["paid"]);
    expect(TAB_STATUSES.closed).toEqual(["cancelled", "refunded"]);
    for (const t of ORDER_TABS) expect(TAB_STATUSES[t]).not.toContain("awaiting_payment");
  });

  it("parses the tab, falls back to old ?status= links, defaults to To ship", () => {
    expect(parseOrderTab("shipped")).toBe("shipped");
    expect(parseOrderTab(undefined, "paid")).toBe("to_ship");
    expect(parseOrderTab(undefined, "refunded")).toBe("closed");
    expect(parseOrderTab(undefined, "all")).toBe("all");
    expect(parseOrderTab("bogus", "bogus")).toBe("to_ship");
    expect(parseOrderTab()).toBe("to_ship");
  });

  it("cleans search text so it can't break the PostgREST filter", () => {
    expect(cleanOrderSearch("  ap-1031 ")).toBe("ap-1031");
    expect(cleanOrderSearch("a%b_c\\d,e(f)g\"h'i*j")).toBe("abcdefghij");
    expect(cleanOrderSearch("x".repeat(150))).toHaveLength(100);
  });

  it("summarises lines and vials", () => {
    expect(itemsSummary([{ pack_qty: 5, quantity: 1 }, { pack_qty: 1, quantity: 1 }])).toBe("2 items · 6 vials");
    expect(itemsSummary([{ pack_qty: 1, quantity: 1 }])).toBe("1 item · 1 vial");
    expect(itemsSummary([])).toBe("0 items · 0 vials");
  });

  it("lists markers in a fixed order", () => {
    expect(orderMarkers({ discount_code_id: "c", partner_id: "p" }, { dispute: true, warning: true })).toEqual(["dispute", "warning", "code", "partner"]);
    expect(orderMarkers({ discount_code_id: null, partner_id: null }, { dispute: false, warning: false })).toEqual([]);
  });

  it("marks a no-charge order first", () => {
    expect(orderMarkers({ discount_code_id: null, partner_id: null, kind: "no_charge" }, { dispute: false, warning: false })).toEqual(["no_charge"]);
    expect(orderMarkers({ discount_code_id: null, partner_id: null, kind: "sale" }, { dispute: false, warning: false })).toEqual([]);
  });
});
