import { describe, expect, it } from "vitest";
import { openingLabel, parseOpeningOn } from "@/lib/early/rules";

describe("opening date", () => {
  it("labels the day", () => expect(openingLabel("2026-12-01")).toBe("Tuesday, December 1"));
  it("accepts a real date after today (shop time) only", () => {
    const now = Date.parse("2026-11-29T20:00:00Z");
    expect(parseOpeningOn("2026-12-01", now)).toEqual({ ok: true, value: "2026-12-01" });
    expect(parseOpeningOn(" 2026-11-30 ", now)).toEqual({ ok: true, value: "2026-11-30" });
    expect(parseOpeningOn("2026-11-29", now).ok).toBe(false);
    expect(parseOpeningOn("2026-02-30", now).ok).toBe(false);
    expect(parseOpeningOn("", now).ok).toBe(false);
  });
  it("uses shop time for today", () => {
    // 2026-11-30 03:00 UTC is still Nov 29 in Denver, so Nov 30 is after today.
    expect(parseOpeningOn("2026-11-30", Date.parse("2026-11-30T03:00:00Z")).ok).toBe(true);
  });
});
