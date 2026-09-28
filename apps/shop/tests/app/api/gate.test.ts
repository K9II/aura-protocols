import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: fromMock }) }));

function insertChain(result: { data: { id: string } | null; error: null | { message: string } }) {
  return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(result) }) }) };
}
function upsertChain(result: { error: null | { message: string } }) {
  return { upsert: vi.fn().mockResolvedValue(result) };
}
const valid = { email: "lab@example.com", age21: true, ruo: true, disputePolicy: true };
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

  it("rejects a bad email with 400", async () => {
    const { POST } = await import("@/app/api/gate/route");
    expect((await POST(post({ ...valid, email: "nope" }))).status).toBe(400);
  });

  it("fails closed with 500 and no cookie when the attestation insert fails", async () => {
    fromMock.mockReturnValueOnce(insertChain({ data: null, error: { message: "db down" } }));
    const { POST } = await import("@/app/api/gate/route");
    const res = await POST(post(valid));
    expect(res.status).toBe(500);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("records the attestation, subscribes the email, and sets both cookies", async () => {
    const attest = insertChain({ data: { id: "att-1" }, error: null });
    const sub = upsertChain({ error: null });
    fromMock.mockImplementation((table: string) => (table === "gate_attestations" ? attest : sub));
    const { POST } = await import("@/app/api/gate/route");
    const { TERMS_VERSION } = await import("@/lib/gate-shared");

    const res = await POST(post(valid));
    expect(res.status).toBe(200);

    const row = attest.insert.mock.calls[0][0];
    expect(row).toMatchObject({ email: "lab@example.com", terms_version: TERMS_VERSION, age_21: true, ruo: true, dispute_policy: true, user_agent: "vitest" });
    expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(sub.upsert).toHaveBeenCalledWith({ email: "lab@example.com", source: "gate" }, { onConflict: "email", ignoreDuplicates: true });

    const cookies = res.headers.get("set-cookie") ?? "";
    expect(cookies).toContain(`aura_gate=${TERMS_VERSION}.att-1.`);
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain(`aura_gate_v=${TERMS_VERSION}`);
  });

  it("still admits the visitor when only the subscriber upsert fails (logged, not blocking)", async () => {
    const attest = insertChain({ data: { id: "att-2" }, error: null });
    const sub = upsertChain({ error: { message: "dup" } });
    fromMock.mockImplementation((table: string) => (table === "gate_attestations" ? attest : sub));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/gate/route");
    expect((await POST(post(valid))).status).toBe(200);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
