import { describe, it, expect } from "vitest";
import { inviteLabel, inviteUrl, newReferralCode, parseReferralCode, REFERRAL_ALPHABET } from "@/lib/waitlist/codes";

describe("waitlist invite codes", () => {
  it("are six characters with no look-alikes", () => {
    for (let i = 0; i < 50; i++) {
      const code = newReferralCode((n) => Uint8Array.from({ length: n }, () => Math.floor(Math.random() * 256)));
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
    expect(REFERRAL_ALPHABET).not.toMatch(/[01IOL]/);
  });

  it("parse a typed or pasted code, else null", () => {
    expect(parseReferralCode(" k7m2qx ")).toBe("K7M2QX");
    expect(parseReferralCode("K7M2Q")).toBeNull();
    expect(parseReferralCode("K7M2Q0")).toBeNull();
    expect(parseReferralCode(null)).toBeNull();
    expect(parseReferralCode("<script>")).toBeNull();
  });

  it("build the ?r= invite link (partner links keep ?ref=)", () => {
    expect(inviteUrl("https://auraprotocols.com", "K7M2QX")).toBe("https://auraprotocols.com/?r=K7M2QX");
    expect(inviteLabel("https://auraprotocols.com", "K7M2QX")).toBe("auraprotocols.com/?r=K7M2QX");
  });
});
