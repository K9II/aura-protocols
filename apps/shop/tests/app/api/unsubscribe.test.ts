import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: fromMock }) }));

const updateChain = (error: null | { message: string }) => ({
  update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error }) }),
});
const get = (qs: string) => new Request(`http://localhost/api/unsubscribe${qs}`);

describe("GET /api/unsubscribe", () => {
  beforeEach(() => { vi.resetModules(); fromMock.mockReset(); });

  it("400s without an email", async () => {
    const { GET } = await import("@/app/api/unsubscribe/route");
    expect((await GET(get(""))).status).toBe(400);
  });

  it("unsubscribes from both the storefront list and the legacy list", async () => {
    fromMock.mockImplementation(() => updateChain(null));
    const { GET } = await import("@/app/api/unsubscribe/route");
    const res = await GET(get("?email=lab%40example.com"));
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("subscribers");
    expect(fromMock).toHaveBeenCalledWith("lead_magnet_contacts");
    expect(await res.text()).toContain("You won't receive any more emails");
  });

  it("normalizes the email (trim + lowercase) before matching", async () => {
    const eqSpy = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation(() => ({ update: vi.fn().mockReturnValue({ eq: eqSpy }) }));
    const { GET } = await import("@/app/api/unsubscribe/route");
    const res = await GET(get("?email=%20%20Lab%40Example.COM%20%20"));
    expect(res.status).toBe(200);
    expect(eqSpy).toHaveBeenCalledWith("email", "lab@example.com");
    expect(eqSpy).not.toHaveBeenCalledWith("email", "  Lab@Example.COM  ");
  });

  it("500s if either update fails", async () => {
    fromMock.mockImplementation((t: string) => updateChain(t === "subscribers" ? { message: "down" } : null));
    const { GET } = await import("@/app/api/unsubscribe/route");
    expect((await GET(get("?email=lab%40example.com"))).status).toBe(500);
  });
});
