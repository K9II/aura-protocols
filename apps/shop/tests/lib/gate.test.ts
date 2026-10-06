import { describe, it, expect, beforeEach } from "vitest";
import { isCrawler, isGateExempt } from "@/lib/gate-shared";

describe("gate", () => {
  beforeEach(() => { process.env.GATE_COOKIE_SECRET = "test-secret"; });

  it("hashIp is stable and secret-keyed", async () => {
    const { hashIp } = await import("@/lib/gate");
    expect(hashIp("1.2.3.4")).toBe(hashIp("1.2.3.4"));
    expect(hashIp("1.2.3.4")).not.toBe(hashIp("1.2.3.5"));
  });

  it("a device flag verifies only when signed with our secret", async () => {
    const { signDeviceFlag, verifyDeviceFlag } = await import("@/lib/gate");
    const v = signDeviceFlag();
    expect(verifyDeviceFlag(v)).toBe(true);
    expect(verifyDeviceFlag(`${v.split(".")[0]}.forged`)).toBe(false);
    expect(verifyDeviceFlag(undefined)).toBe(false);
    expect(verifyDeviceFlag(`${v}.garbage`)).toBe(false);
    expect(verifyDeviceFlag(`${v}.`)).toBe(false);
  });

  it("recognises crawlers", () => {
    expect(isCrawler("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isCrawler("Mozilla/5.0 (iPhone)")).toBe(false);
  });

  it("exempts legal pages, account entry pages and email landings", () => {
    for (const p of ["/terms", "/refund-policy", "/privacy", "/shipping", "/ruo", "/sign-in", "/forgot-password", "/reset-password", "/verified", "/unsubscribed", "/auth/verify", "/auth/callback", "/finish-account"]) {
      expect(isGateExempt(p), p).toBe(true);
    }
    for (const p of ["/", "/products", "/products/bpc-157", "/coa", "/cart"]) expect(isGateExempt(p), p).toBe(false);
  });
});
