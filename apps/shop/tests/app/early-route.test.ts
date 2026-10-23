import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const earlyAccessOpen = vi.fn();
vi.mock("@/lib/early/data", () => ({ earlyAccessOpen: () => earlyAccessOpen() }));

describe("GET /early", () => {
  beforeEach(() => { vi.resetModules(); process.env.EMAIL_LINK_SECRET = "s"; process.env.PRELAUNCH = "1"; earlyAccessOpen.mockReset(); });
  afterEach(() => { delete process.env.PRELAUNCH; });

  const call = async (t: string | null) => {
    const { GET } = await import("@/app/early/route");
    return GET(new NextRequest(`http://localhost/early${t === null ? "" : `?t=${encodeURIComponent(t)}`}`));
  };
  const link = async () => {
    const { earlyLinkUrl } = await import("@/lib/early/token");
    return new URL(earlyLinkUrl("http://localhost", "K7QM2P")).searchParams.get("t")!;
  };

  it("a valid link while early access is on sets the cookie and opens the store", async () => {
    earlyAccessOpen.mockResolvedValue(true);
    const res = await call(await link());
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost/");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/aura_early=K7QM2P\.\d+\./);
    expect(cookie.toLowerCase()).toContain("httponly");
    const { readEarlyCookie } = await import("@/lib/early/token");
    expect(readEarlyCookie(decodeURIComponent(/aura_early=([^;]+)/.exec(cookie)![1]))).toBe("K7QM2P");
  });

  it("a bad link or early access off lands on the coming-soon notice, no cookie", async () => {
    earlyAccessOpen.mockResolvedValue(true);
    for (const t of ["K7QM2P.forged", "", null]) {
      const res = await call(t);
      expect(res.headers.get("location"), String(t)).toBe("http://localhost/?early=closed");
      expect(res.headers.get("set-cookie") ?? "").not.toContain("aura_early");
    }
    earlyAccessOpen.mockResolvedValue(false);
    expect((await call(await link())).headers.get("location")).toBe("http://localhost/?early=closed");
    vi.spyOn(console, "error").mockImplementation(() => {});
    earlyAccessOpen.mockRejectedValue(new Error("db down"));
    expect((await call(await link())).headers.get("location")).toBe("http://localhost/?early=closed");
  });

  it("after launch a valid link still sets the cookie (for the code at checkout), switch or not", async () => {
    delete process.env.PRELAUNCH;
    earlyAccessOpen.mockResolvedValue(false);
    const res = await call(await link());
    expect(res.headers.get("location")).toBe("http://localhost/");
    expect(res.headers.get("set-cookie") ?? "").toContain("aura_early=K7QM2P");
  });
});
