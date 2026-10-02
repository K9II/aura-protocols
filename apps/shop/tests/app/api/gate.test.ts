import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: fromMock }) }));

function insertChain(result: { data: { id: string } | null; error: null | { message: string } }) {
  return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(result) }) }) };
}
function upsertChain(result: { error: null | { message: string } }) {
  return { upsert: vi.fn().mockResolvedValue(result) };
}
const valid = { age21: true, ruo: true, disputePolicy: true };
const post = (body: unknown) =>
  new Request("http://localhost/api/gate", {
    method: "POST",
    headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1", "user-agent": "vitest" },
    body: JSON.stringify(body),
  });

describe("POST /api/gate", () => {
  beforeEach(() => {
    vi.resetModules();
    fromMock.mockReset();
    process.env.GATE_COOKIE_SECRET = "test-secret";
  });

  it("rejects an unchecked box with 400 and writes nothing", async () => {
    const { POST } = await import("@/app/api/gate/route");
    const res = await POST(post({ ...valid, disputePolicy: false }));
    expect(res.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("fails closed with 500 and no cookie when the attestation insert fails", async () => {
    fromMock.mockReturnValueOnce(insertChain({ data: null, error: { message: "db down" } }));
    const { POST } = await import("@/app/api/gate/route");
    const res = await POST(post(valid));
    expect(res.status).toBe(500);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("records the attestation without asking who the visitor is, and sets both cookies", async () => {
    const attest = insertChain({ data: { id: "att-1" }, error: null });
    fromMock.mockImplementation((table: string) => (table === "gate_attestations" ? attest : upsertChain({ error: null })));
    const { POST } = await import("@/app/api/gate/route");
    const { TERMS_VERSION } = await import("@/lib/gate-shared");

    const res = await POST(post(valid));
    expect(res.status).toBe(200);

    const row = attest.insert.mock.calls[0][0];
    expect(row).toMatchObject({ terms_version: TERMS_VERSION, age_21: true, ruo: true, dispute_policy: true, user_agent: "vitest" });
    expect(row).not.toHaveProperty("email");
    expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(fromMock).not.toHaveBeenCalledWith("subscribers");

    const cookies = res.headers.get("set-cookie") ?? "";
    expect(cookies).toContain(`aura_gate=${TERMS_VERSION}.att-1.`);
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain(`aura_gate_v=${TERMS_VERSION}`);
  });

});
