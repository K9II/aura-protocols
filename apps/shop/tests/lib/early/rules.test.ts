import { describe, expect, it } from "vitest";
import { earlyCodeEndsAt, earlyCodeInput, openingLabel, parseOpeningOn } from "@/lib/early/rules";
import { NEW_ACCOUNT_PCT } from "@/lib/account/offer";

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
  it("codes end NEW_ACCOUNT_DAYS after opening, end of day Mountain", () => {
    expect(earlyCodeEndsAt("2026-12-01")).toBe("2026-12-05T06:59:00.000Z"); // Dec 4 23:59 MST
  });
});

describe("early code terms", () => {
  it("one use, the new-account percent, not tied to an email", () => {
    expect(earlyCodeInput("2026-12-01", "a@b.co")).toMatchObject({
      kind: "item_pct", value: NEW_ACCOUNT_PCT, max_uses: 1, once_per_customer: true, locked_email: null,
      stack_on_top: false, starts_at: null, ends_at: "2026-12-05T06:59:00.000Z", status: "active", note: "Early access · a@b.co",
    });
  });
});
