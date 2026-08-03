import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
const sendMock = vi.fn();

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdminClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/ses", () => ({
  sendLeadMagnetEmail: sendMock,
}));

function upsertChain(result: { error: null | { message: string } }) {
  return {
    upsert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
  };
}

describe("POST /api/subscribe", () => {
  beforeEach(() => {
    vi.resetModules();
    fromMock.mockReset();
    sendMock.mockReset();
  });

  it("rejects an invalid email with 400", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://localhost/api/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", goal: "Weight Loss" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects an unknown goal with 400", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://localhost/api/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "reader@example.com", goal: "Not A Real Goal" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("stores the contact and sends the matching template on success", async () => {
    fromMock.mockReturnValue(upsertChain({ error: null }));
    sendMock.mockResolvedValueOnce({ messageId: "abc-123" });

    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://localhost/api/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "reader@example.com", goal: "Weight Loss" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("lead_magnet_contacts");
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "reader@example.com",
        subject: "Your weight-loss starting protocol — 3 compounds, real doses",
      })
    );
  });

  it("returns 500 without sending if the database write fails", async () => {
    fromMock.mockReturnValue(upsertChain({ error: { message: "db down" } }));

    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://localhost/api/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "reader@example.com", goal: "Weight Loss" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
