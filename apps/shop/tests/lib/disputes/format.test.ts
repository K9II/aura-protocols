import { describe, it, expect } from "vitest";
import { addressText, carrierName, longDate, pdfSafe, plural, utcStamp } from "@/lib/disputes/format";

describe("dispute formatting", () => {
  it("names carriers", () => {
    expect(carrierName("usps")).toBe("USPS");
    expect(carrierName("fedex")).toBe("FedEx");
    expect(carrierName("ontrac")).toBe("ONTRAC");
    expect(carrierName(null)).toBe("");
  });

  it("letter dates are shop (Mountain) dates; log stamps are UTC to the second", () => {
    expect(longDate("2026-09-22T18:00:00Z")).toBe("September 22, 2026");
    expect(longDate("2026-09-15T01:02:00Z")).toBe("September 14, 2026"); // 7:02 pm Mountain, the day before
    expect(utcStamp("2026-09-15T01:02:41.123Z")).toBe("2026-09-15 01:02:41 UTC");
  });

  it("addresses and plurals", () => {
    expect(addressText({ name: "Dana Whitfield", line1: "1420 Elm St", line2: "Apt 3", city: "Boulder", state: "CO", zip: "80302" }))
      .toBe("Dana Whitfield, 1420 Elm St, Apt 3, Boulder, CO 80302");
    expect(addressText({ name: "D", line1: "1 A St", line2: null, city: "B", state: "CO", zip: "80302" })).toBe("D, 1 A St, B, CO 80302");
    expect(plural(1, "vial")).toBe("1 vial");
    expect(plural(1200, "charge")).toBe("1,200 charges");
  });

  it("pdfSafe keeps WinAnsi text and replaces what the standard PDF fonts can't draw", () => {
    expect(pdfSafe("Dana — AP-1031 ≤ ≥ “q” ‘s’ … 😀 é · ×")).toBe("Dana - AP-1031 <= >= \"q\" 's' ... ? é · ×");
    expect(pdfSafe("a\tb\u0007c\nd")).toBe("a  b?c\nd");
  });
});
