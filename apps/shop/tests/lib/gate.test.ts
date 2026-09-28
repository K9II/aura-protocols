import { describe, it, expect, beforeEach } from "vitest";
import { TERMS_VERSION, isCrawler, hasCurrentGateHint } from "@/lib/gate-shared";
import { signGateToken, verifyGateToken, hashIp } from "@/lib/gate";

describe("gate", () => {
  beforeEach(() => { process.env.GATE_COOKIE_SECRET = "test-secret"; });

  it("round-trips a signed token for the current terms version", () => {
    const t = signGateToken(TERMS_VERSION, "abc");
    expect(verifyGateToken(t)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const t = signGateToken(TERMS_VERSION, "abc");
    expect(verifyGateToken(t.replace(".abc.", ".xyz."))).toBe(false);
    expect(verifyGateToken("garbage")).toBe(false);
  });

  it("rejects a token signed for an older terms version", () => {
    expect(verifyGateToken(signGateToken("2000-01-01", "abc"))).toBe(false);
  });

  it("throws when the secret is missing (fail loudly, never sign with empty key)", () => {
    delete process.env.GATE_COOKIE_SECRET;
    expect(() => signGateToken(TERMS_VERSION, "abc")).toThrow(/GATE_COOKIE_SECRET/);
  });

  it("hashes IPs deterministically without exposing them", () => {
    expect(hashIp("1.2.3.4")).toBe(hashIp("1.2.3.4"));
    expect(hashIp("1.2.3.4")).not.toContain("1.2.3.4");
  });

  it("recognizes major search crawlers only", () => {
    expect(isCrawler("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isCrawler("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe(true);
    expect(isCrawler("Mozilla/5.0 (Windows NT 10.0) Chrome/130")).toBe(false);
  });

  it("reads the version hint cookie", () => {
    expect(hasCurrentGateHint(`a=1; aura_gate_v=${TERMS_VERSION}; b=2`)).toBe(true);
    expect(hasCurrentGateHint("aura_gate_v=2000-01-01")).toBe(false);
    expect(hasCurrentGateHint("")).toBe(false);
  });
});
