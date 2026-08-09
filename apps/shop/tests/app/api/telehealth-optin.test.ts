import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: fromMock }) }));

function upsertChain(result: { error: null | { message: string } }) {
  return { upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(result) }) }) };
}

describe("POST /api/telehealth/optin", () => {
  beforeEach(() => { vi.resetModules(); fromMock.mockReset(); });

  it("rejects an invalid email with 400", async () => {
    const { POST } = await import("@/app/api/telehealth/optin/route");
    const req = new Request("http://localhost/api/telehealth/optin", { method: "POST", body: JSON.stringify({ email: "nope", category: "weight-loss" }) });
    expect((await POST(req)).status).toBe(400);
  });

  it("stores the opt-in and returns 200", async () => {
    fromMock.mockReturnValue(upsertChain({ error: null }));
    const { POST } = await import("@/app/api/telehealth/optin/route");
    const req = new Request("http://localhost/api/telehealth/optin", { method: "POST", body: JSON.stringify({ email: "a@b.com", category: "weight-loss" }) });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("telehealth_optins");
  });

  it("returns 500 when the DB write fails", async () => {
    fromMock.mockReturnValue(upsertChain({ error: { message: "db down" } }));
    const { POST } = await import("@/app/api/telehealth/optin/route");
    const req = new Request("http://localhost/api/telehealth/optin", { method: "POST", body: JSON.stringify({ email: "a@b.com", category: "weight-loss" }) });
    expect((await POST(req)).status).toBe(500);
  });
});
