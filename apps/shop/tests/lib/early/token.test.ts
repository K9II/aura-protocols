import { beforeEach, describe, expect, it } from "vitest";
import { earlyLinkUrl, readEarlyCookie, signEarlyCookie, verifyEarlyToken, EARLY_COOKIE_MAX_AGE_S } from "@/lib/early/token";

beforeEach(() => { process.env.EMAIL_LINK_SECRET = "test-secret"; });

const tokenOf = (url: string) => new URL(url).searchParams.get("t")!;

describe("early link token", () => {
  it("round-trips the invite code", () => {
    const url = earlyLinkUrl("https://auraprotocols.com", "K7QM2P");
    expect(url.startsWith("https://auraprotocols.com/early?t=K7QM2P.")).toBe(true);
    expect(verifyEarlyToken(tokenOf(url))).toBe("K7QM2P");
  });
  it("refuses a changed code, a bad signature or junk", () => {
    const t = tokenOf(earlyLinkUrl("https://x", "K7QM2P"));
    expect(verifyEarlyToken(t.replace("K7QM2P", "K7QM2Q"))).toBeNull();
    expect(verifyEarlyToken("K7QM2P.nope")).toBeNull();
    expect(verifyEarlyToken(`${t}.extra`)).toBeNull();
    expect(verifyEarlyToken(t.toLowerCase())).toBeNull();
    expect(verifyEarlyToken("")).toBeNull();
    expect(verifyEarlyToken(null)).toBeNull();
  });
  it("needs the secret", () => {
    delete process.env.EMAIL_LINK_SECRET;
    expect(() => earlyLinkUrl("https://x", "K7QM2P")).toThrow(/EMAIL_LINK_SECRET/);
  });
});

describe("early cookie", () => {
  it("round-trips within its age and expires after", () => {
    const v = signEarlyCookie("K7QM2P", 1_000);
    expect(readEarlyCookie(v, 2_000)).toBe("K7QM2P");
    expect(readEarlyCookie(v, 1_000 + EARLY_COOKIE_MAX_AGE_S * 1000 + 1)).toBeNull();
    expect(readEarlyCookie(v.slice(0, -1) + (v.endsWith("x") ? "y" : "x"), 2_000)).toBeNull();
    expect(readEarlyCookie(undefined)).toBeNull();
  });
  it("a link token is not a cookie", () => {
    expect(readEarlyCookie(tokenOf(earlyLinkUrl("https://x", "K7QM2P")), 2_000)).toBeNull();
  });
});
