import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const rpc = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), rpc }) }));

const agreement = { version: "2026-10-02", ipHash: "h", userAgent: "ua" };
const application = { channels: { youtube: "youtube.com/@smithlab" }, audienceSize: "5k_25k" as const, promotion: "newsletter" };

describe("partner data", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); process.env.PAYOUT_DETAILS_KEY = randomBytes(32).toString("base64"); });

  it("createApplication inserts an applied partner and its agreement", async () => {
    const existing = query({ data: null });
    const insertP = query({ data: { id: "p1" } });
    const insertA = query({});
    from = fromQueue({ partners: [existing, insertP], partner_agreements: [insertA] });
    const { createApplication } = await import("@/lib/partners/data");
    expect(await createApplication({ customerId: "u1", partnerType: "academic_researcher", code: "SMITHLAB", application, agreement })).toEqual({ id: "p1" });
    expect(callArgs(insertP, "insert")?.[0]).toMatchObject({ customer_id: "u1", status: "applied", partner_type: "academic_researcher", code: "SMITHLAB", application });
    expect(callArgs(insertA, "insert")?.[0]).toMatchObject({ partner_id: "p1", version: "2026-10-02", ip_hash: "h", user_agent: "ua" });
  });

  it("createApplication refuses a second application and a taken code", async () => {
    from = fromQueue({ partners: [query({ data: { id: "p0" } })] });
    const { createApplication } = await import("@/lib/partners/data");
    expect(await createApplication({ customerId: "u1", partnerType: "podcaster", code: "X1X", application, agreement })).toEqual({ error: "already_applied" });
    from = fromQueue({ partners: [query({ data: null }), query({ error: { code: "23505" } }), query({ data: null })] });
    expect(await createApplication({ customerId: "u2", partnerType: "podcaster", code: "TAKEN", application, agreement })).toEqual({ error: "code_taken" });
  });

  it("createApplication treats a 23505 raced against the same customer as already_applied, not code_taken", async () => {
    from = fromQueue({ partners: [query({ data: null }), query({ error: { code: "23505" } }), query({ data: { id: "p9" } })] });
    const { createApplication } = await import("@/lib/partners/data");
    expect(await createApplication({ customerId: "u3", partnerType: "podcaster", code: "X1X", application, agreement })).toEqual({ error: "already_applied" });
  });

  it("createApplication deletes the partner row and throws if recording the agreement fails", async () => {
    const existing = query({ data: null });
    const insertP = query({ data: { id: "p1" } });
    const insertA = query({ error: { message: "boom" } });
    const del = query({});
    from = fromQueue({ partners: [existing, insertP, del], partner_agreements: [insertA] });
    const { createApplication } = await import("@/lib/partners/data");
    await expect(createApplication({ customerId: "u1", partnerType: "academic_researcher", code: "SMITHLAB", application, agreement }))
      .rejects.toThrow("partner agreement insert failed");
    expect(callArgs(del, "delete")).toEqual([]);
    expect(del.calls.some(([m, a]) => m === "eq" && a[0] === "id" && a[1] === "p1")).toBe(true);
  });

  it("getApprovedPartnerByCode only returns approved partners, by normalized code", async () => {
    const q = query({ data: { id: "p1", code: "SMITHLAB", status: "approved" } });
    from = fromQueue({ partners: [q] });
    const { getApprovedPartnerByCode } = await import("@/lib/partners/data");
    expect((await getApprovedPartnerByCode(" smithlab "))?.id).toBe("p1");
    expect(q.calls.filter(([m]) => m === "eq").map(([, a]) => a)).toEqual([["code", "SMITHLAB"], ["status", "approved"]]);
  });

  it("setPartnerStatus refuses illegal moves and stamps legal ones", async () => {
    from = fromQueue({});
    const { setPartnerStatus } = await import("@/lib/partners/data");
    await expect(setPartnerStatus("p1", "declined", "approved")).rejects.toThrow("Illegal partner transition declined → approved");
    const q = query({ data: [{ id: "p1" }] });
    from = fromQueue({ partners: [q] });
    expect(await setPartnerStatus("p1", "applied", "approved")).toBe(true);
    expect(callArgs(q, "update")?.[0]).toMatchObject({ status: "approved", approved_at: expect.any(String) });
  });

  it("setPayoutMethod stores details encrypted with a masked hint", async () => {
    const q = query({});
    from = fromQueue({ partners: [q] });
    const { setPayoutMethod } = await import("@/lib/partners/data");
    await setPayoutMethod("p1", { kind: "ach", routing: "021000021", account: "123456784821", bank: "Chase" });
    const patch = callArgs(q, "update")?.[0] as Record<string, string>;
    expect(patch.payout_method).toBe("ach");
    expect(patch.payout_details_hint).toBe("ACH · checking ••••4821 · Chase");
    expect(patch.payout_details_enc).not.toContain("123456784821");
  });

  it("recordClickByCode counts a click for an approved partner only", async () => {
    from = fromQueue({ partners: [query({ data: { id: "p1", status: "approved" } }), query({ data: null })], partner_code_aliases: [query({ data: null })] });
    const { recordClickByCode } = await import("@/lib/partners/data");
    await recordClickByCode("SMITHLAB");
    expect(rpc).toHaveBeenCalledWith("record_partner_click", { p_partner: "p1" });
    rpc.mockClear();
    await recordClickByCode("NOPE");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("an old code (alias) still finds its partner", async () => {
    from = fromQueue({
      partners: [query({ data: null }), query({ data: { id: "p1", code: "SMITHLAB2", status: "approved" } })],
      partner_code_aliases: [query({ data: { partner_id: "p1" } })],
    });
    const { getApprovedPartnerByCode } = await import("@/lib/partners/data");
    expect((await getApprovedPartnerByCode("SMITHLAB"))?.code).toBe("SMITHLAB2");
  });

  it("isCodeTaken checks current codes and aliases; issueCode retries until a random code is free", async () => {
    from = fromQueue({ partners: [query({ data: null })], partner_code_aliases: [query({ data: { code: "K7M2Q9XP" } })] });
    const { isCodeTaken, issueCode } = await import("@/lib/partners/data");
    expect(await isCodeTaken("k7m2q9xp")).toBe(true);
    from = fromQueue({
      partners: [query({ data: { id: "x" } }), query({ data: null })],
      partner_code_aliases: [query({ data: null })],
    });
    expect(await issueCode()).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    expect(from).toHaveBeenCalledTimes(3); // first candidate taken, second free
  });

  it("changeCode keeps the old code as an alias and switches to the new one", async () => {
    const alias = query({});
    const upd = query({ data: [{ id: "p1" }] });
    from = fromQueue({ partner_code_aliases: [alias], partners: [upd] });
    const { changeCode } = await import("@/lib/partners/data");
    expect(await changeCode("p1", "K7M2Q9XP", "SMITHLAB")).toEqual({ ok: true });
    expect(callArgs(alias, "insert")?.[0]).toEqual({ code: "K7M2Q9XP", partner_id: "p1" });
    expect(callArgs(upd, "update")?.[0]).toEqual({ code: "SMITHLAB" });
    from = fromQueue({ partner_code_aliases: [query({})], partners: [query({ error: { code: "23505" } })] });
    expect(await changeCode("p1", "SMITHLAB", "TAKEN")).toEqual({ error: "code_taken" });
  });
});
