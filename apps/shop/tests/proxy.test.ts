import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const recordClickByCode = vi.fn();
vi.mock("@/lib/partners/data", () => ({ recordClickByCode }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: vi.fn() } }) }));

const event = () => ({ waitUntil: vi.fn() });

describe("proxy referral links", () => {
  beforeEach(() => { vi.resetModules(); recordClickByCode.mockReset(); recordClickByCode.mockResolvedValue(undefined); process.env.PARTNER_REF_SECRET = "s"; });

  it("sets a signed 60-day aura_ref cookie and records the click", async () => {
    const { proxy } = await import("@/proxy");
    const ev = event();
    const res = await proxy(new NextRequest("http://localhost/products?ref=smithlab"), ev as never);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/aura_ref=SMITHLAB\.\d+\./);
    expect(cookie).toMatch(/Max-Age=5184000/);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(ev.waitUntil).toHaveBeenCalledTimes(1);
    expect(recordClickByCode).toHaveBeenCalledWith("SMITHLAB");
  });

  it("ignores invalid or blocked codes", async () => {
    const { proxy } = await import("@/proxy");
    const res = await proxy(new NextRequest("http://localhost/?ref=aura-free"), event() as never);
    expect(res.headers.get("set-cookie") ?? "").not.toContain("aura_ref");
    expect(recordClickByCode).not.toHaveBeenCalled();
  });
});
