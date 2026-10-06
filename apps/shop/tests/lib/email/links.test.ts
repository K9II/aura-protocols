import { describe, it, expect, beforeEach } from "vitest";

describe("email links", () => {
  beforeEach(() => { process.env.EMAIL_LINK_SECRET = "test-secret-0123456789"; });

  it("normalizes emails", async () => {
    const { normalizeEmail } = await import("@/lib/email/links");
    expect(normalizeEmail("  Lab@Example.COM ")).toBe("lab@example.com");
  });

  it("signs and verifies unsubscribe links, case-insensitively by email", async () => {
    const { unsubscribeSig, verifyUnsubscribe, unsubscribeUrl } = await import("@/lib/email/links");
    const sig = unsubscribeSig("lab@example.com");
    expect(verifyUnsubscribe("LAB@example.com", sig)).toBe(true);
    expect(verifyUnsubscribe("other@example.com", sig)).toBe(false);
    expect(verifyUnsubscribe("lab@example.com", "forged")).toBe(false);
    expect(verifyUnsubscribe("lab@example.com", null)).toBe(false);
    expect(unsubscribeUrl("https://auraprotocols.com", "lab@example.com"))
      .toBe(`https://auraprotocols.com/api/unsubscribe?e=lab%40example.com&s=${sig}`);
  });

  it("throws when the secret is missing", async () => {
    delete process.env.EMAIL_LINK_SECRET;
    const { unsubscribeSig } = await import("@/lib/email/links");
    expect(() => unsubscribeSig("a@b.co")).toThrow("EMAIL_LINK_SECRET");
  });

  it("makes confirm tokens whose hash matches", async () => {
    const { newConfirmToken, hashToken } = await import("@/lib/email/links");
    const a = newConfirmToken(), b = newConfirmToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(32);
    expect(hashToken(a.token)).toBe(a.hash);
  });
});

describe("unsubscribe tags", () => {
  beforeEach(() => { process.env.EMAIL_LINK_SECRET = "s"; });
  it("signs the tag with the email; old links without a tag still verify", async () => {
    const { unsubscribeUrl, verifyUnsubscribe, unsubscribeSig } = await import("@/lib/email/links");
    const url = new URL(unsubscribeUrl("https://auraprotocols.com", "A@b.co", "campaign.k1"));
    expect(url.searchParams.get("e")).toBe("a@b.co");
    expect(url.searchParams.get("c")).toBe("campaign.k1");
    expect(verifyUnsubscribe("a@b.co", url.searchParams.get("s"), "campaign.k1")).toBe(true);
    expect(verifyUnsubscribe("a@b.co", url.searchParams.get("s"), "welcome_1")).toBe(false);
    expect(verifyUnsubscribe("a@b.co", unsubscribeSig("a@b.co"), null)).toBe(true);
    expect(new URL(unsubscribeUrl("https://auraprotocols.com", "a@b.co")).searchParams.has("c")).toBe(false);
  });
  it("parses tags", async () => {
    const { parseUnsubTag } = await import("@/lib/email/links");
    expect(parseUnsubTag("welcome_3")).toEqual({ kind: "welcome_3", ref: null });
    expect(parseUnsubTag("cart_2")).toEqual({ kind: "cart_2", ref: null });
    expect(parseUnsubTag("campaign.0b6f1c2e-1111-4222-8333-944455556666")).toEqual({ kind: "campaign", ref: "0b6f1c2e-1111-4222-8333-944455556666" });
    expect(parseUnsubTag("campaign.nope")).toBeNull();
    expect(parseUnsubTag("drop table")).toBeNull();
    expect(parseUnsubTag(null)).toBeNull();
  });
});
