import { describe, it, expect } from "vitest";
import { HOLIDAY_END, HOLIDAY_START, HOLIDAY_WINDOW_TEXT, isHolidaySeason } from "@/lib/holiday/season";
import { zonedToIso } from "@/lib/discounts/time";

// Shop time (America/Denver) wall clock → epoch ms.
const mt = (local: string) => Date.parse(zonedToIso(local));

describe("isHolidaySeason (Dec 1 00:00 through Jan 1 23:59, shop time, every year)", () => {
  it("has the window as recurring month/day constants", () => {
    expect(HOLIDAY_START).toEqual({ month: 12, day: 1 });
    expect(HOLIDAY_END).toEqual({ month: 1, day: 1 });
    expect(HOLIDAY_WINDOW_TEXT).toBe("Dec 1 – Jan 1");
  });

  it("starts at Dec 1 00:00 MT, not a minute earlier", () => {
    expect(isHolidaySeason(mt("2026-11-30T23:59"))).toBe(false);
    expect(isHolidaySeason(mt("2026-12-01T00:00"))).toBe(true);
  });

  it("runs through Jan 1 23:59 MT and ends on Jan 2", () => {
    expect(isHolidaySeason(mt("2026-12-25T12:00"))).toBe(true);
    expect(isHolidaySeason(mt("2026-12-31T23:59"))).toBe(true);
    expect(isHolidaySeason(mt("2027-01-01T23:59"))).toBe(true);
    expect(isHolidaySeason(mt("2027-01-02T00:00"))).toBe(false);
  });

  it("recurs every year", () => {
    expect(isHolidaySeason(mt("2031-12-01T00:00"))).toBe(true);
    expect(isHolidaySeason(mt("2032-01-01T12:00"))).toBe(true);
    expect(isHolidaySeason(mt("2031-11-30T23:59"))).toBe(false);
  });

  it("is off the rest of the year", () => {
    for (const d of ["2026-10-06T12:00", "2026-07-04T12:00", "2027-03-14T03:30", "2027-11-07T01:30"]) expect(isHolidaySeason(mt(d))).toBe(false);
  });

  it("uses the shop's real zone, not a fixed offset (DST-safe)", () => {
    // 06:30 UTC on Dec 1 is still Nov 30, 23:30 in Denver (MST, UTC-7); a
    // summer-time (UTC-6) or UTC assumption would wrongly say Dec 1.
    expect(isHolidaySeason(Date.parse("2026-12-01T06:30:00Z"))).toBe(false);
    expect(isHolidaySeason(Date.parse("2026-12-01T07:00:00Z"))).toBe(true);
    expect(isHolidaySeason(Date.parse("2027-01-02T06:59:59Z"))).toBe(true);
    expect(isHolidaySeason(Date.parse("2027-01-02T07:00:00Z"))).toBe(false);
  });
});
