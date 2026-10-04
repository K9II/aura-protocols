import { describe, it, expect, vi, beforeEach } from "vitest";

const upsertPending = vi.fn();
const sendTracked = vi.fn();
const alertOwner = vi.fn();
vi.mock("@/lib/email/data", () => ({ upsertPending, sendTracked }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
let refCookie: string | undefined;
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (refCookie ? { value: refCookie } : undefined) }) }));
vi.mock("@/lib/partners/ref-cookie", () => ({ REF_COOKIE: "aura_ref", readRef: (v: string | undefined) => (v ? "SMITHLAB" : null) }));

const post = (body: unknown) => new Request("http://localhost/api/subscribe", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

describe("POST /api/subscribe", () => {
  beforeEach(() => { vi.resetModules(); refCookie = undefined; for (const f of [upsertPending, sendTracked, alertOwner]) f.mockReset(); });

  it("rejects a bad email", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    expect((await POST(post({ email: "nope", source: "popup" }))).status).toBe(400);
  });

  it("quietly accepts but ignores the honeypot", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const res = await POST(post({ email: "a@b.co", source: "popup", website: "spam.example" }));
    expect(res.status).toBe(200);
    expect(upsertPending).not.toHaveBeenCalled();
  });

  it("creates a pending subscriber and sends the confirmation", async () => {
    upsertPending.mockResolvedValue({ state: "pending", token: "tok" });
    sendTracked.mockResolvedValue("sent");
    const { POST } = await import("@/app/api/subscribe/route");
    const res = await POST(post({ email: "Lab@Example.com", source: "popup" }));
    expect(await res.json()).toEqual({ ok: true, state: "pending" });
    expect(upsertPending).toHaveBeenCalledWith({ email: "lab@example.com", source: "popup", partnerRef: null });
    const arg = sendTracked.mock.calls[0][0];
    expect(arg.kind).toBe("confirm");
    expect(arg.msg.html).toContain("https://auraprotocols.com/api/subscribe/confirm?token=tok");
  });

  it("records the partner from the referral cookie", async () => {
    refCookie = "signed";
    upsertPending.mockResolvedValue({ state: "pending", token: "tok" });
    sendTracked.mockResolvedValue("sent");
    const { POST } = await import("@/app/api/subscribe/route");
    await POST(post({ email: "a@b.co", source: "footer" }));
    expect(upsertPending).toHaveBeenCalledWith({ email: "a@b.co", source: "footer", partnerRef: "SMITHLAB" });
  });

  it("tells an already-confirmed subscriber, without sending anything", async () => {
    upsertPending.mockResolvedValue({ state: "confirmed" });
    const { POST } = await import("@/app/api/subscribe/route");
    expect(await (await POST(post({ email: "a@b.co", source: "popup" }))).json()).toEqual({ ok: true, state: "confirmed" });
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("500s and alerts the owner when the confirmation can't be sent", async () => {
    upsertPending.mockResolvedValue({ state: "pending", token: "tok" });
    sendTracked.mockRejectedValue(new Error("ses down"));
    const { POST } = await import("@/app/api/subscribe/route");
    expect((await POST(post({ email: "a@b.co", source: "popup" }))).status).toBe(500);
    expect(alertOwner).toHaveBeenCalled();
  });
});
