import { describe, it, expect } from "vitest";
import { blockRefusal, cleanSearch, fingerprint, offerState, parseCredit, parseTab, summarizeUserAgent } from "@/lib/customers/rules";

describe("customer rules", () => {
  it("tabs default to all", () => {
    expect(parseTab("blocked")).toBe("blocked");
    expect(parseTab("nope")).toBe("all");
    expect(parseTab(undefined)).toBe("all");
  });

  it("search is trimmed, capped and stripped of LIKE wildcards", () => {
    expect(cleanSearch("  ap-1026 ")).toBe("ap-1026");
    expect(cleanSearch("50%_off\\")).toBe("50off");
    expect(cleanSearch("x".repeat(200))).toHaveLength(100);
  });

  const base = { direction: "add", amount: "50", category: "goodwill", note: "", email: "on", message: "" };
  it("parses an add with email", () => {
    expect(parseCredit(base, 12_000)).toEqual({ ok: true, value: { amountCents: 5_000, category: "goodwill", note: null, email: true, message: null } });
  });
  it("a removal is negative, never emails, and can't exceed the balance", () => {
    expect(parseCredit({ ...base, direction: "remove", amount: "30" }, 12_000)).toMatchObject({ ok: true, value: { amountCents: -3_000, email: false } });
    expect(parseCredit({ ...base, direction: "remove", amount: "130" }, 12_000)).toEqual({ ok: false, fieldErrors: { amount: "That's more than the $120.00 balance." } });
  });
  it("requires a positive amount up to $5,000, a known reason, and a note for Other", () => {
    expect(parseCredit({ ...base, amount: "0" }, 0)).toMatchObject({ ok: false, fieldErrors: { amount: expect.any(String) } });
    expect(parseCredit({ ...base, amount: "5000.01" }, 0)).toMatchObject({ ok: false, fieldErrors: { amount: expect.any(String) } });
    expect(parseCredit({ ...base, category: "gift" }, 0)).toMatchObject({ ok: false, fieldErrors: { category: expect.any(String) } });
    expect(parseCredit({ ...base, category: "other" }, 0)).toMatchObject({ ok: false, fieldErrors: { note: "Say what it's for." } });
  });

  it("never blocks an owner or yourself", () => {
    expect(blockRefusal({ id: "a", isOwner: true, isStaff: false }, "me")).toMatch(/owner/);
    expect(blockRefusal({ id: "me", isOwner: false, isStaff: false }, "me")).toMatch(/yourself/);
    expect(blockRefusal({ id: "a", isOwner: false, isStaff: false }, "me")).toBeNull();
  });

  it("never blocks a team login — disable it on the Team page instead", () => {
    expect(blockRefusal({ id: "a", isOwner: false, isStaff: true }, "me")).toBe("A team login can't be blocked — disable it on the Team page first.");
  });

  it("summarises a user agent and shortens the IP hash", () => {
    expect(summarizeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari on iPhone");
    expect(summarizeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/129.0 Safari/537.36")).toBe("Chrome on macOS");
    expect(summarizeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/131.0")).toBe("Firefox on Windows");
    expect(summarizeUserAgent("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/129.0 Safari/537.36 Edg/129.0")).toBe("Edge on Windows");
    expect(summarizeUserAgent(null)).toBe("Not recorded");
    expect(fingerprint("3f9a1c07deadbeef")).toBe("3f9a1c07");
    expect(fingerprint(null)).toBe("—");
  });

  it("new-account offer: used, open, or expired", () => {
    const now = Date.parse("2026-10-04T12:00:00Z");
    expect(offerState("2026-10-01T00:00:00Z", "AP-1041", now)).toEqual({ kind: "used", order: "AP-1041" });
    expect(offerState("2026-10-03T00:00:00Z", null, now)).toEqual({ kind: "open", until: "2026-10-06T00:00:00.000Z" });
    expect(offerState("2026-09-20T00:00:00Z", null, now)).toEqual({ kind: "expired" });
  });
});
