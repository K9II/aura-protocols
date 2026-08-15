import { describe, it, expect } from "vitest";
import { PRESCRIBE_URL, PRESCRIBE_LABEL, SHOP_URL } from "@/lib/constants";

describe("prescribe routing constants", () => {
  it("routes prescribe-grade demand to Modality", () => {
    expect(PRESCRIBE_URL).toBe("https://modalitybio.com");
    expect(PRESCRIBE_LABEL).toMatch(/Modality/);
  });
  it("keeps the shop as the research/affiliate lane", () => {
    expect(SHOP_URL).toBe("https://auraprotocols.com");
  });
  it("no longer exports the shelved Aura Clinical url", async () => {
    const mod = await import("@/lib/constants");
    expect("CLINICAL_URL" in mod).toBe(false);
  });
});
