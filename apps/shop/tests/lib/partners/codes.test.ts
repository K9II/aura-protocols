import { describe, it, expect } from "vitest";
import { PARTNER_TYPES, PARTNER_TYPE_IDS, validateCode, normalizeCode, generateCode, PARTNER_AGREEMENT_VERSION, AUDIENCE_SIZES, PUBLISH_CHANNELS } from "@/lib/partners/codes";

describe("partner codes", () => {
  it("offers exactly the 11 approved applicant types, in two groups, with no 'other'", () => {
    expect(PARTNER_TYPE_IDS).toEqual([
      "academic_researcher", "industry_researcher", "research_group", "clinician", "pharmacist", "educator",
      "publisher", "video_creator", "podcaster", "social_creator", "community_host",
    ]);
    expect(PARTNER_TYPES.filter((t) => t.group === "research")).toHaveLength(6);
    expect(PARTNER_TYPES.filter((t) => t.group === "media")).toHaveLength(5);
    expect(PARTNER_TYPE_IDS).not.toContain("other");
  });

  it("normalizes to upper case without spaces", () => {
    expect(normalizeCode("  smith lab ")).toBe("SMITHLAB");
  });

  it("accepts 3–20 letters/numbers", () => {
    expect(validateCode("smithlab")).toEqual({ ok: true, code: "SMITHLAB" });
    expect(validateCode("AB")).toEqual({ ok: false, reason: "length" });
    expect(validateCode("A".repeat(21))).toEqual({ ok: false, reason: "length" });
    expect(validateCode("SMITH-LAB")).toEqual({ ok: false, reason: "characters" });
  });

  it("blocks brand-like and reserved words anywhere in the code", () => {
    expect(validateCode("AURALAB")).toEqual({ ok: false, reason: "blocked" });
    expect(validateCode("MYAURA10")).toEqual({ ok: false, reason: "blocked" });
    expect(validateCode("FREEPEP")).toEqual({ ok: false, reason: "blocked" });
    expect(validateCode("DOSELAB")).toEqual({ ok: false, reason: "blocked" });
  });

  it("issues random 8-character codes from an unambiguous alphabet, never a blocked word", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
      expect(validateCode(code).ok).toBe(true);
    }
    expect(generateCode(() => 0)).toBe("AAAAAAAA");
    // A generator that would spell FREE first must retry.
    const seq = ["F", "R", "E", "E", "A", "A", "A", "A", "B", "B", "B", "B", "B", "B", "B", "B"].map((ch) => "ABCDEFGHJKMNPQRSTUVWXYZ23456789".indexOf(ch) / 31 + 0.001);
    let n = 0;
    expect(generateCode(() => seq[n++])).toBe("BBBBBBBB");
  });

  it("has a dated agreement version without dots and four audience sizes", () => {
    expect(PARTNER_AGREEMENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(AUDIENCE_SIZES.map((a) => a.id)).toEqual(["under_5k", "5k_25k", "25k_100k", "over_100k"]);
    expect(PUBLISH_CHANNELS.map((c) => c.id)).toEqual(["youtube", "instagram", "tiktok", "x", "facebook", "podcast"]);
  });
});
