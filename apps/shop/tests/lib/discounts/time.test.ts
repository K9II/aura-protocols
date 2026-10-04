import { describe, it, expect } from "vitest";
import { isoToZonedLocal, shortDate, dateTime, zonedToIso } from "@/lib/discounts/time";

describe("Mountain time", () => {
  it("converts a form's local time to ISO across daylight saving", () => {
    expect(zonedToIso("2026-10-31T23:59")).toBe("2026-11-01T05:59:00.000Z"); // MDT −6
    expect(zonedToIso("2026-12-15T00:00")).toBe("2026-12-15T07:00:00.000Z"); // MST −7
  });
  it("round-trips back to the form value", () => {
    expect(isoToZonedLocal("2026-11-01T05:59:00.000Z")).toBe("2026-10-31T23:59");
    expect(isoToZonedLocal("2026-12-15T07:00:00.000Z")).toBe("2026-12-15T00:00");
  });
  it("formats short dates and date-times for the admin", () => {
    expect(shortDate("2026-11-01T05:59:00.000Z")).toBe("Oct 31");
    expect(dateTime("2026-10-03T22:12:00.000Z")).toBe("Oct 3, 4:12 pm");
  });
  it("rejects malformed input", () => {
    expect(() => zonedToIso("not a date")).toThrow();
  });
});
