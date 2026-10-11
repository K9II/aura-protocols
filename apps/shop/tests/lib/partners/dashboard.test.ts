import { describe, it, expect } from "vitest";
import { cashOwedNote, commissionChip, nextCashPayout } from "@/lib/partners/dashboard";

describe("partner dashboard labels", () => {
  it("names each commission state in the partner's words", () => {
    expect(commissionChip({ state: "pending", clears_at: null })).toEqual({ tone: "pending", label: "Not shipped" });
    expect(commissionChip({ state: "clearing", clears_at: "2026-10-26T12:00:00Z" })).toEqual({ tone: "clearing", label: "Clears Oct 26" });
    expect(commissionChip({ state: "payable", clears_at: null })).toEqual({ tone: "cleared", label: "Clearing today" });
    expect(commissionChip({ state: "paid", clears_at: null })).toEqual({ tone: "cleared", label: "Cleared" });
    expect(commissionChip({ state: "void", clears_at: null })).toEqual({ tone: "removed", label: "Refunded" });
  });
  it("says why cash is waiting, or when it's next paid", () => {
    expect(cashOwedNote({ carryCents: 1764, w9Checked: true, next: "Oct 15" })).toBe("paid once it reaches $100");
    expect(cashOwedNote({ carryCents: 1764, w9Checked: false, next: "Oct 15" })).toBe("paid once your W-9 is checked");
    expect(cashOwedNote({ carryCents: 0, w9Checked: true, next: "Oct 15" })).toBe("next cash payout Oct 15");
  });
  it("next cash payout is the coming 1st or 15th (UTC)", () => {
    expect(nextCashPayout(new Date("2026-10-11T10:00:00Z"))).toBe("Oct 15");
    expect(nextCashPayout(new Date("2026-10-15T10:00:00Z"))).toBe("Oct 15");
    expect(nextCashPayout(new Date("2026-10-16T10:00:00Z"))).toBe("Nov 1");
    expect(nextCashPayout(new Date("2026-12-20T10:00:00Z"))).toBe("Jan 1");
    expect(nextCashPayout(new Date("2026-11-01T10:00:00Z"))).toBe("Nov 1");
  });
});
