import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: the mock factory runs before the static import below, so the
// mock fn must be created in the hoisted block, not as a plain top-level const.
const { getStaff, getCustomer, getPartnerForCustomer } = vi.hoisted(() => ({
  getStaff: vi.fn(), getCustomer: vi.fn(), getPartnerForCustomer: vi.fn(),
}));
vi.mock("@/lib/dal", () => ({ getStaff, getCustomer }));
vi.mock("@/lib/partners/data", () => ({ getPartnerForCustomer }));
import { GET } from "@/app/api/me/owner/route";

describe("GET /api/me/owner", () => {
  beforeEach(() => {
    getStaff.mockReset(); getCustomer.mockReset(); getPartnerForCustomer.mockReset();
    getCustomer.mockResolvedValue(null); getPartnerForCustomer.mockResolvedValue(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("says owner: true for any active staff login (Owner or Assistant)", async () => {
    getStaff.mockResolvedValue({ id: "s1", role: "assistant", status: "active", isAssistant: true, permissions: new Set() });
    const res = await GET();
    expect(await res.json()).toEqual({ owner: true, partner: false });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("says owner: false for a customer with no staff row, and for signed-out visitors", async () => {
    getStaff.mockResolvedValue(null);
    expect(await (await GET()).json()).toEqual({ owner: false, partner: false });
    expect(getPartnerForCustomer).not.toHaveBeenCalled();
  });

  it("says partner: true for a signed-in customer with a partner record, false without one", async () => {
    getStaff.mockResolvedValue(null);
    getCustomer.mockResolvedValue({ id: "c1" });
    getPartnerForCustomer.mockResolvedValue({ id: "p1", status: "approved" });
    expect(await (await GET()).json()).toEqual({ owner: false, partner: true });
    expect(getPartnerForCustomer).toHaveBeenCalledWith("c1");
    getPartnerForCustomer.mockResolvedValue(null);
    expect(await (await GET()).json()).toEqual({ owner: false, partner: false });
  });

  it("a staff read error is never shown to the visitor: owner: false, logged, never thrown", async () => {
    getStaff.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(await res.json()).toEqual({ owner: false, partner: false });
    expect(res.status).toBe(200);
    expect(console.error).toHaveBeenCalledWith("staff check for Admin link failed:", expect.any(Error));
  });

  it("a partner read error: partner: false, logged, owner still answered", async () => {
    getStaff.mockResolvedValue({ id: "s1" });
    getCustomer.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(await res.json()).toEqual({ owner: true, partner: false });
    expect(console.error).toHaveBeenCalledWith("partner check for Partner link failed:", expect.any(Error));
  });
});
