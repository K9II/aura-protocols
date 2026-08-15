import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";

const fromMock = vi.fn();
vi.mock("@/lib/telehealth/supabase", () => ({ getTelehealthSupabaseClient: () => ({ from: fromMock }) }));

const SECRET = "whsec_test";
function signedRequest(payload: object) {
  const raw = JSON.stringify(payload);
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac("sha256", SECRET).update(`${t}.${raw}`).digest("hex");
  return new Request("http://localhost/api/telehealth/webhook", {
    method: "POST",
    body: raw,
    headers: { "X-LegUpRx-Signature": `t=${t},v1=${v1}`, "X-LegUpRx-Event": "order.created", "X-LegUpRx-Delivery": "d-1" },
  });
}
function upsertOk() { return { upsert: vi.fn().mockResolvedValue({ error: null }) }; }

describe("POST /api/telehealth/webhook", () => {
  beforeEach(() => { vi.resetModules(); fromMock.mockReset(); process.env.LEGUPRX_WEBHOOK_SECRET = SECRET; });
  afterEach(() => { delete process.env.LEGUPRX_WEBHOOK_SECRET; });

  it("stores a valid signed event and returns 200", async () => {
    fromMock.mockReturnValue(upsertOk());
    const { POST } = await import("@/app/api/telehealth/webhook/route");
    const res = await POST(signedRequest({ event: "order.created", data: {} }));
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("telehealth_events");
  });

  it("rejects an unsigned request with 401 and does not store", async () => {
    fromMock.mockReturnValue(upsertOk());
    const { POST } = await import("@/app/api/telehealth/webhook/route");
    const req = new Request("http://localhost/api/telehealth/webhook", { method: "POST", body: JSON.stringify({ event: "order.created" }) });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the secret is not configured", async () => {
    delete process.env.LEGUPRX_WEBHOOK_SECRET;
    const { POST } = await import("@/app/api/telehealth/webhook/route");
    expect((await POST(signedRequest({ event: "order.created" }))).status).toBe(503);
  });
});
