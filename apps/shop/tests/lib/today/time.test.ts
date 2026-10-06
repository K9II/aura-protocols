import { describe, it, expect } from "vitest";
import { addDays, businessDaysSince, dateLabel, headerDate, hourLabel, paidText, shipAge, whenText } from "@/lib/today/time";

const NOW = Date.parse("2026-10-06T15:42:00Z"); // Tue Oct 6, 9:42 am Mountain (MDT)

describe("today time helpers", () => {
  it("adds calendar days across months", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts business days since payment in shop time, skipping weekends", () => {
    expect(businessDaysSince("2026-10-06T14:00:00Z", NOW)).toBe(0); // this morning
    expect(businessDaysSince("2026-10-05T15:00:00Z", NOW)).toBe(1); // Mon
    expect(businessDaysSince("2026-10-02T15:00:00Z", NOW)).toBe(2); // Fri → Mon, Tue
    expect(businessDaysSince("2026-10-01T15:00:00Z", NOW)).toBe(3); // Thu → Fri, Mon, Tue
    expect(businessDaysSince("2026-10-03T05:00:00Z", NOW)).toBe(2); // 11 pm Friday in Mountain time is still Friday
  });

  it("an order is late after SHIP_LATE_BUSINESS_DAYS business days", () => {
    expect(shipAge("2026-10-06T14:00:00Z", NOW)).toEqual({ text: "today", late: false });
    expect(shipAge("2026-10-05T15:00:00Z", NOW)).toEqual({ text: "1 day", late: false });
    expect(shipAge("2026-10-02T15:00:00Z", NOW)).toEqual({ text: "4 days", late: false });
    expect(shipAge("2026-10-01T15:00:00Z", NOW)).toEqual({ text: "3 bus. days · late", late: true });
  });

  it("times: today shows the time only, other days the date", () => {
    expect(whenText("2026-10-06T14:15:00Z", NOW)).toBe("8:15 am");
    expect(whenText("2026-10-03T20:41:00Z", NOW)).toBe("Oct 3, 2:41 pm");
    expect(paidText("2026-10-06T13:51:00Z", NOW)).toBe("paid today 7:51 am");
    expect(paidText("2026-10-02T15:00:00Z", NOW)).toBe("paid Fri, Oct 2");
  });

  it("header date and labels", () => {
    expect(headerDate(NOW)).toBe("Tuesday, Oct 6 · shop time (Mountain) · 9:42 am");
    expect(hourLabel(NOW)).toBe("9 am");
    expect(dateLabel("2026-09-12")).toBe("Sep 12");
  });
});
