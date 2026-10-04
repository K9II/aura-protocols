import { describe, it, expect, vi, beforeEach } from "vitest";

const getCustomer = vi.fn();
vi.mock("@/lib/dal", () => ({ getCustomer }));
vi.mock("@/lib/gate", () => ({ DEVICE_FLAG_COOKIE: "aura_dev", DEVICE_FLAG_MAX_AGE_S: 100, signDeviceFlag: () => "signed" }));

describe("GET /api/me/gate", () => {
  beforeEach(() => { vi.resetModules(); getCustomer.mockReset(); });

  it("anon when signed out, never cached", async () => {
    getCustomer.mockResolvedValue(null);
    const { GET } = await import("@/app/api/me/gate/route");
    const res = await GET();
    expect(await res.json()).toEqual({ state: "anon" });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("ok for a signed-in account that isn't flagged (verified or not)", async () => {
    getCustomer.mockResolvedValue({ email: "j@lab.org", emailConfirmed: false, verifyRequired: false });
    const { GET } = await import("@/app/api/me/gate/route");
    expect(await (await GET()).json()).toEqual({ state: "ok" });
  });

  it("verify for a flagged, unverified account — and flags the device", async () => {
    getCustomer.mockResolvedValue({ email: "j@lab.org", emailConfirmed: false, verifyRequired: true });
    const { GET } = await import("@/app/api/me/gate/route");
    const res = await GET();
    expect(await res.json()).toEqual({ state: "verify", email: "j@lab.org" });
    expect(res.headers.get("set-cookie")).toMatch(/aura_dev=signed/);
  });
});
