import { describe, it, expect, vi, beforeEach } from "vitest";

const getApprovedPartnerByCode = vi.fn();
vi.mock("@/lib/partners/data", () => ({ getApprovedPartnerByCode }));

const smith = { id: "p1", code: "SMITHLAB", customer_id: "u9", status: "approved" };
const other = { id: "p2", code: "BENCHNOTES", customer_id: "u8", status: "approved" };

describe("resolveAttribution", () => {
  beforeEach(() => { vi.resetModules(); getApprovedPartnerByCode.mockReset(); process.env.PARTNER_REF_SECRET = "s"; });

  it("a typed code wins over a link cookie", async () => {
    getApprovedPartnerByCode.mockImplementation(async (c: string) => (c === "SMITHLAB" ? smith : c === "BENCHNOTES" ? other : null));
    const { signRef } = await import("@/lib/partners/ref-cookie");
    const { resolveAttribution } = await import("@/lib/partners/attribution");
    expect(await resolveAttribution({ typedCode: "smithlab", refCookie: signRef("BENCHNOTES"), buyerCustomerId: "u1" }))
      .toEqual({ attribution: { partnerId: "p1", code: "SMITHLAB", via: "code" } });
  });

  it("falls back to the most recent link within 60 days", async () => {
    getApprovedPartnerByCode.mockResolvedValue(other);
    const { signRef } = await import("@/lib/partners/ref-cookie");
    const { resolveAttribution } = await import("@/lib/partners/attribution");
    expect(await resolveAttribution({ typedCode: "", refCookie: signRef("BENCHNOTES"), buyerCustomerId: "u1" }))
      .toEqual({ attribution: { partnerId: "p2", code: "BENCHNOTES", via: "link" } });
  });

  it("refuses unknown, suspended and own codes with a message", async () => {
    getApprovedPartnerByCode.mockResolvedValue(null);
    const { resolveAttribution } = await import("@/lib/partners/attribution");
    expect(await resolveAttribution({ typedCode: "NOPE1", buyerCustomerId: "u1" })).toEqual({ attribution: null, codeError: "This code can't be used." });
    getApprovedPartnerByCode.mockResolvedValue(smith);
    expect(await resolveAttribution({ typedCode: "SMITHLAB", buyerCustomerId: "u9" })).toEqual({ attribution: null, codeError: "You can't use your own partner code." });
  });

  it("ignores a link cookie that points at the buyer", async () => {
    getApprovedPartnerByCode.mockResolvedValue(smith);
    const { signRef } = await import("@/lib/partners/ref-cookie");
    const { resolveAttribution } = await import("@/lib/partners/attribution");
    expect(await resolveAttribution({ refCookie: signRef("SMITHLAB"), buyerCustomerId: "u9" })).toEqual({ attribution: null });
  });
});
