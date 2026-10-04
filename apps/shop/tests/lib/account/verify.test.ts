import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const getUserById = vi.fn(), sendEmail = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), auth: { admin: { getUserById } } }) }));
vi.mock("@/lib/ses", () => ({ sendEmail }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));

describe("verification", () => {
  beforeEach(() => { vi.resetModules(); getUserById.mockReset(); sendEmail.mockReset(); sendEmail.mockResolvedValue({ messageId: "m1" }); });

  it("sendVerifyEmail stores only the token hash and emails the link", async () => {
    const upd = query({});
    from = fromQueue({ customers: [upd] });
    const { sendVerifyEmail } = await import("@/lib/account/verify");
    await sendVerifyEmail("u1", "j@lab.org");
    const patch = callArgs(upd, "update")?.[0] as { verify_token_hash: string; verify_sent_at: string };
    expect(patch.verify_token_hash).toMatch(/^[0-9a-f]{64}$/);
    const link = /href="([^"]+)"/.exec(sendEmail.mock.calls[0][0].html)![1];
    expect(link).toMatch(/^https:\/\/auraprotocols\.com\/auth\/verify\?token=/);
    expect(link).not.toContain(patch.verify_token_hash);
    expect(sendEmail.mock.calls[0][0].to).toBe("j@lab.org");
  });

  it("consumeVerifyToken verifies a fresh token once and reports a repeat click as already", async () => {
    const sent = new Date().toISOString();
    from = fromQueue({ customers: [
      query({ data: { id: "u1", email_verified_at: null, verify_sent_at: sent, marketing_opt_in: true } }),
      query({ data: [{ id: "u1" }] }),
    ] });
    getUserById.mockResolvedValue({ data: { user: { email: "j@lab.org" } }, error: null });
    const { consumeVerifyToken } = await import("@/lib/account/verify");
    expect(await consumeVerifyToken("tok")).toEqual({ customerId: "u1", email: "j@lab.org", optIn: true, already: false });

    from = fromQueue({ customers: [query({ data: { id: "u1", email_verified_at: sent, verify_sent_at: sent, marketing_opt_in: true } })] });
    expect(await consumeVerifyToken("tok")).toEqual({ customerId: "u1", email: "j@lab.org", optIn: true, already: true });
  });

  it("consumeVerifyToken rejects an unknown or week-old token", async () => {
    from = fromQueue({ customers: [query({ data: null })] });
    const { consumeVerifyToken } = await import("@/lib/account/verify");
    expect(await consumeVerifyToken("nope")).toBeNull();
    from = fromQueue({ customers: [query({ data: { id: "u1", email_verified_at: null, verify_sent_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(), marketing_opt_in: false } })] });
    expect(await consumeVerifyToken("old")).toBeNull();
  });
});
