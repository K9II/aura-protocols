import { describe, it, expect, vi, beforeEach } from "vitest";

const underLookupLimit = vi.fn(), accountIdByEmail = vi.fn();
vi.mock("@/lib/account/data", async () => {
  const actual = await vi.importActual<typeof import("@/lib/account/data")>("@/lib/account/data");
  return { ...actual, underLookupLimit, accountIdByEmail };
});
vi.mock("@/lib/gate", () => ({ hashIp: (ip: string) => `h:${ip}` }));
const post = (body: unknown, ip = "1.2.3.4") => new Request("http://localhost/api/gate/lookup", {
  method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body),
});

describe("POST /api/gate/lookup", () => {
  beforeEach(() => { vi.resetModules(); underLookupLimit.mockReset(); accountIdByEmail.mockReset(); underLookupLimit.mockResolvedValue(true); });

  it("400s a bad email", async () => {
    const { POST } = await import("@/app/api/gate/lookup/route");
    expect((await POST(post({ email: "nope" }))).status).toBe(400);
  });

  it("sends a known email to sign-in and an unknown one to create", async () => {
    const { POST } = await import("@/app/api/gate/lookup/route");
    accountIdByEmail.mockResolvedValueOnce("u1").mockResolvedValueOnce(null);
    expect(await (await POST(post({ email: "Jane@Lab.org" }))).json()).toEqual({ next: "sign-in" });
    expect(await (await POST(post({ email: "new@lab.org" }))).json()).toEqual({ next: "create" });
    expect(accountIdByEmail).toHaveBeenNthCalledWith(1, "jane@lab.org");
    expect(underLookupLimit).toHaveBeenCalledWith("h:1.2.3.4");
  });

  it("429s over the limit without looking anything up", async () => {
    underLookupLimit.mockResolvedValue(false);
    const { POST } = await import("@/app/api/gate/lookup/route");
    expect((await POST(post({ email: "a@b.co" }))).status).toBe(429);
    expect(accountIdByEmail).not.toHaveBeenCalled();
  });

  it("takes at least the minimum time either way", async () => {
    accountIdByEmail.mockResolvedValue(null);
    const { POST } = await import("@/app/api/gate/lookup/route");
    const { MIN_RESPONSE_MS } = await import("@/lib/account/data");
    const t = Date.now();
    await POST(post({ email: "a@b.co" }));
    expect(Date.now() - t).toBeGreaterThanOrEqual(MIN_RESPONSE_MS - 5);
  });

  it("500s (no answer) when the lookup fails", async () => {
    accountIdByEmail.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/gate/lookup/route");
    expect((await POST(post({ email: "a@b.co" }))).status).toBe(500);
  });
});
