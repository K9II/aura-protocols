import { describe, it, expect } from "vitest";
import { VOLUME_NUDGE_MIN_KITS, VOLUME_QUOTE_MIN_KITS, volumeNudge, volumeQuoteMessage } from "@/lib/wholesale/rules";

// Mock "Volume Quote Mocks", option B (2026-10-11): nudge from 40 kits, quote from 50.
describe("volume quotes", () => {
  it("nudges from the nudge threshold and offers a quote from the quote threshold", () => {
    expect(VOLUME_NUDGE_MIN_KITS).toBe(40);
    expect(VOLUME_QUOTE_MIN_KITS).toBe(50);
    expect(volumeNudge(39)).toBeNull();
    expect(volumeNudge(40)).toEqual({ kind: "near", kitsNeeded: 10 });
    expect(volumeNudge(49)).toEqual({ kind: "near", kitsNeeded: 1 });
    expect(volumeNudge(50)).toEqual({ kind: "quote" });
    expect(volumeNudge(200)).toEqual({ kind: "quote" });
  });

  it("writes the order as one line per strength with the kit total", () => {
    expect(volumeQuoteMessage([
      { compoundName: "Retatrutide", strength: "10 mg", quantity: 49 },
      { compoundName: "BPC-157", strength: "10 mg", quantity: 1 },
    ])).toBe("Volume quote request (50 kits):\n- Retatrutide 10 mg: 49 kits\n- BPC-157 10 mg: 1 kit");
  });
});
