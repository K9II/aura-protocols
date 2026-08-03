import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdminClient: () => ({ from: fromMock }),
}));

function updateChain(result: { error: null | { message: string } }) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(result),
    }),
  };
}

describe("GET /api/unsubscribe", () => {
  beforeEach(() => {
    vi.resetModules();
    fromMock.mockReset();
  });

  it("returns 400 with no email param", async () => {
    const { GET } = await import("@/app/api/unsubscribe/route");
    const res = await GET(new Request("http://localhost/api/unsubscribe"));
    expect(res.status).toBe(400);
  });

  it("marks the contact unsubscribed and returns 200", async () => {
    fromMock.mockReturnValue(updateChain({ error: null }));
    const { GET } = await import("@/app/api/unsubscribe/route");
    const res = await GET(
      new Request("http://localhost/api/unsubscribe?email=reader%40example.com")
    );
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("lead_magnet_contacts");
  });
});
