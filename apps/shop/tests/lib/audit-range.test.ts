import { describe, it, expect } from "vitest";
import { activityRange } from "@/lib/audit/range";

describe("activityRange", () => {
  it("covers whole days in shop time, To inclusive", () => {
    // October = MDT (UTC−6): midnight MT is 06:00 UTC.
    expect(activityRange("2026-10-01", "2026-10-06")).toEqual({ from: "2026-10-01", to: "2026-10-06", since: "2026-10-01T06:00:00.000Z", until: "2026-10-07T06:00:00.000Z" });
  });
  it("allows one open end, swaps a reversed range, ignores junk", () => {
    expect(activityRange("2026-12-01", undefined)).toEqual({ from: "2026-12-01", to: undefined, since: "2026-12-01T07:00:00.000Z", until: undefined });
    expect(activityRange("2026-10-06", "2026-10-01").from).toBe("2026-10-01");
    expect(activityRange("yesterday", "2026-13-45")).toEqual({ from: undefined, to: undefined, since: undefined, until: undefined });
  });
});

describe("periodRange", () => {
  it("rolls Today / 7 days / 30 days back from the shop-time date", async () => {
    const { periodRange } = await import("@/lib/audit/range");
    expect(periodRange("today", "2026-10-06")).toMatchObject({ period: "today", from: "2026-10-06", to: "2026-10-06" });
    expect(periodRange("7d", "2026-10-06")).toMatchObject({ from: "2026-09-30", to: "2026-10-06" });
    expect(periodRange("30d", "2026-10-06")).toMatchObject({ from: "2026-09-07", to: "2026-10-06" });
    expect(periodRange("dates", "2026-10-06", "2026-10-01", undefined)).toMatchObject({ period: "dates", from: "2026-10-01", to: undefined });
    expect(periodRange(undefined, "2026-10-06")).toMatchObject({ period: undefined, since: undefined, until: undefined });
  });
});
