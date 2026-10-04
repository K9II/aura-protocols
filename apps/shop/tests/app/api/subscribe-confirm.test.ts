import { describe, it, expect, vi, beforeEach } from "vitest";

const confirmSubscriber = vi.fn();
const sendTracked = vi.fn();
const alertOwner = vi.fn();
vi.mock("@/lib/email/data", () => ({ confirmSubscriber, sendTracked }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));

const get = (qs: string) => new Request(`http://localhost/api/subscribe/confirm${qs}`);
const row = { email: "a@b.co", welcome_code: "AURA-7K2Q", welcome_code_expires_at: "2099-12-15T23:59:59.999Z", welcome_code_used_order_id: null, partner_ref: null };

describe("GET /api/subscribe/confirm", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [confirmSubscriber, sendTracked, alertOwner]) f.mockReset();
    process.env.EMAIL_LINK_SECRET = "s"; process.env.MAILING_ADDRESS = "Aura Protocols LLC · 1 A St";
  });

  it("redirects invalid or used tokens to the 'invalid' page", async () => {
    confirmSubscriber.mockResolvedValue(null);
    const { GET } = await import("@/app/api/subscribe/confirm/route");
    const res = await GET(get("?token=nope"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://auraprotocols.com/subscribed?state=invalid");
  });

  it("confirms, sends File 01 with the code, and redirects", async () => {
    confirmSubscriber.mockResolvedValue({ row, already: false });
    sendTracked.mockResolvedValue("sent");
    const { GET } = await import("@/app/api/subscribe/confirm/route");
    const res = await GET(get("?token=tok"));
    expect(res.headers.get("location")).toBe("https://auraprotocols.com/subscribed");
    const arg = sendTracked.mock.calls[0][0];
    expect(arg).toMatchObject({ email: "a@b.co", kind: "welcome_1", ref: null });
    expect(arg.msg.html).toContain("AURA-7K2Q");
    expect(arg.unsubscribeUrl).toContain("/api/unsubscribe?e=a%40b.co&s=");
  });

  it("still redirects to success when File 01 fails, and alerts the owner (the hourly run retries)", async () => {
    confirmSubscriber.mockResolvedValue({ row, already: false });
    sendTracked.mockRejectedValue(new Error("ses"));
    const { GET } = await import("@/app/api/subscribe/confirm/route");
    expect((await GET(get("?token=tok"))).headers.get("location")).toBe("https://auraprotocols.com/subscribed");
    expect(alertOwner).toHaveBeenCalled();
  });

  it("redirects to 'error' and alerts the owner when confirmSubscriber itself fails", async () => {
    confirmSubscriber.mockRejectedValue(new Error("db down"));
    const { GET } = await import("@/app/api/subscribe/confirm/route");
    const res = await GET(get("?token=tok"));
    expect(res.headers.get("location")).toBe("https://auraprotocols.com/subscribed?state=error");
    expect(alertOwner).toHaveBeenCalledWith("Email confirm failed", expect.stringContaining("db down"));
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("redirects to 'returning' and sends nothing for an already-confirmed token (double-click)", async () => {
    confirmSubscriber.mockResolvedValue({ row, already: true });
    const { GET } = await import("@/app/api/subscribe/confirm/route");
    const res = await GET(get("?token=tok"));
    expect(res.headers.get("location")).toBe("https://auraprotocols.com/subscribed?state=returning");
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("redirects to 'returning' when sendTracked reports File 01 already went out", async () => {
    confirmSubscriber.mockResolvedValue({ row, already: false });
    sendTracked.mockResolvedValue("duplicate");
    const { GET } = await import("@/app/api/subscribe/confirm/route");
    const res = await GET(get("?token=tok"));
    expect(res.headers.get("location")).toBe("https://auraprotocols.com/subscribed?state=returning");
  });
});
