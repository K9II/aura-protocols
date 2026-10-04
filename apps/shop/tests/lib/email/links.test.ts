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
