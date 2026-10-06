import { describe, it, expect } from "vitest";
import { axisLabels, fillBuckets, parsePeriod, periodRanges } from "@/lib/today/periods";

const NOW = Date.parse("2026-10-06T15:42:00Z"); // Tue Oct 6, 9:42 am MDT

describe("today periods", () => {
  it("parses ?p=, defaulting to today", () => {
    expect(parsePeriod("7d")).toBe("7d");
    expect(parsePeriod("30d")).toBe("30d");
    expect(parsePeriod(undefined)).toBe("today");
    expect(parsePeriod("90d")).toBe("today");
  });

  it("today runs from Mountain midnight to now; the prior period is yesterday up to the same time", () => {
    const r = periodRanges("today", NOW);
    expect(r.cur).toEqual({ from: "2026-10-06T06:00:00.000Z", to: "2026-10-06T15:42:00.000Z" });
    expect(r.prior).toEqual({ from: "2026-10-05T06:00:00.000Z", to: "2026-10-05T15:42:00.000Z" });
    expect(r.bucket).toBe("hour");
    expect(r.keys).toHaveLength(24);
    expect(r.keys[0]).toBe("2026-10-06T00:00");
    expect(r.keys[23]).toBe("2026-10-06T23:00");
    expect(r.nowIndex).toBe(9);
  });

  it("7 and 30 days include today; the prior period is the same stretch just before", () => {
    const w = periodRanges("7d", NOW);
    expect(w.cur.from).toBe("2026-09-30T06:00:00.000Z");
    expect(w.prior).toEqual({ from: "2026-09-23T06:00:00.000Z", to: "2026-09-29T15:42:00.000Z" });
    expect(w.bucket).toBe("day");
    expect(w.keys).toHaveLength(7);
    expect(w.keys[0]).toBe("2026-09-30T00:00");
    expect(w.nowIndex).toBe(6);
    const m = periodRanges("30d", NOW);
    expect(m.cur.from).toBe("2026-09-07T06:00:00.000Z");
    expect(m.keys).toHaveLength(30);
  });

  it("the day DST ends (Nov 1 2026): midnight was MDT, 10 am is MST", () => {
    const r = periodRanges("today", Date.parse("2026-11-02T17:00:00Z")); // Mon Nov 2, 10:00 am MST
    expect(r.cur.from).toBe("2026-11-02T07:00:00.000Z");
    expect(r.prior).toEqual({ from: "2026-11-01T06:00:00.000Z", to: "2026-11-01T17:00:00.000Z" });
  });

  it("the week DST starts (Mar 8 2026)", () => {
    const r = periodRanges("7d", Date.parse("2026-03-10T18:00:00Z")); // Tue Mar 10, noon MDT
    expect(r.cur.from).toBe("2026-03-04T07:00:00.000Z");
    expect(r.prior).toEqual({ from: "2026-02-25T07:00:00.000Z", to: "2026-03-03T19:00:00.000Z" });
  });

  it("fills empty buckets with zero and labels the axis", () => {
    expect(fillBuckets(["a", "b", "c"], [{ at: "b", cents: 500 }])).toEqual([0, 500, 0]);
    expect(axisLabels("today", periodRanges("today", NOW).keys)).toEqual(["12a", "6a", "12p", "6p", "11p"]);
    expect(axisLabels("7d", periodRanges("7d", NOW).keys)).toEqual(["Sep 30", "Oct 3", "Oct 6"]);
    expect(axisLabels("30d", periodRanges("30d", NOW).keys)).toEqual(["Sep 7", "Sep 17", "Sep 27", "Oct 6"]);
  });
});
