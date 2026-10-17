import { describe, it, expect } from "vitest";
import { VOLUME_NUDGE_MIN_KITS, VOLUME_QUOTE_MIN_KITS, nextCutoffAfter, volumeNudge, volumeQuoteMessage } from "@/lib/wholesale/rules";

// Mock "Volume Quote Mocks", option B (2026-10-11); since 2026-10-17 (Alvester): nudge from 20 kits, quote from 30.
describe("volume quotes", () => {
  it("nudges from the nudge threshold and offers a quote from the quote threshold", () => {
    expect(VOLUME_NUDGE_MIN_KITS).toBe(20);
    expect(VOLUME_QUOTE_MIN_KITS).toBe(30);
    expect(volumeNudge(19)).toBeNull();
    expect(volumeNudge(20)).toEqual({ kind: "near", kitsNeeded: 10 });
    expect(volumeNudge(29)).toEqual({ kind: "near", kitsNeeded: 1 });
    expect(volumeNudge(30)).toEqual({ kind: "quote" });
    expect(volumeNudge(200)).toEqual({ kind: "quote" });
  });

  it("writes the order as one line per strength with the kit total", () => {
    expect(volumeQuoteMessage([
      { compoundName: "Retatrutide", strength: "10 mg", quantity: 49 },
      { compoundName: "BPC-157", strength: "10 mg", quantity: 1 },
    ])).toBe("Volume quote request (50 kits):\n- Retatrutide 10 mg: 49 kits\n- BPC-157 10 mg: 1 kit");
  });

  it("names the run after this one on the Quote requested page (an override moves only the current run)", () => {
    expect(nextCutoffAfter("2026-10-19", 14)).toBe("2026-11-02");
    expect(nextCutoffAfter("2026-10-22", 14)).toBe("2026-11-02");
    expect(nextCutoffAfter("2026-11-02", 7)).toBe("2026-11-09");
  });
});
