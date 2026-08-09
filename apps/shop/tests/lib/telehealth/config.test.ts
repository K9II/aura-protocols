import { describe, it, expect, afterEach } from "vitest";
import { getPartnerId, TELEHEALTH_CATEGORIES, categoryLabel } from "@/lib/telehealth/config";

afterEach(() => { delete process.env.TELEHEALTH_PARTNER_ID; });

describe("telehealth config", () => {
  it("returns the env partner id when set", () => {
    process.env.TELEHEALTH_PARTNER_ID = "AURA123";
    expect(getPartnerId()).toBe("AURA123");
  });

  it("falls back to the documented example id in non-production", () => {
    delete process.env.TELEHEALTH_PARTNER_ID;
    expect(getPartnerId()).toBe("RFMLPVN1");
  });

  it("lists the five public catalog categories", () => {
    expect(TELEHEALTH_CATEGORIES).toEqual([
      "weight-loss", "mens-health", "womens-health", "hair-loss", "wellness",
    ]);
  });

  it("maps category slugs to human labels, with a title-case fallback", () => {
    expect(categoryLabel("mens-health")).toBe("Men's Health");
    expect(categoryLabel("weight-loss")).toBe("Weight Loss");
    expect(categoryLabel("some-new-thing")).toBe("Some New Thing");
  });
});
