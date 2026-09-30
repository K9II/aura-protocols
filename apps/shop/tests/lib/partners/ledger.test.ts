import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const rpc = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), rpc }) }));

describe("partner ledger", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); rpc.mockResolvedValue({ data: null, error: null }); });

  it("createCommission records the order once and adds its base to lifetime sales", async () => {
    const q = query({});
    from = fromQueue({ commissions: [q] });
    const { createCommission } = await import("@/lib/partners/ledger");
    expect(await createCommission({ partnerId: "p1", orderId: "o1", attributedBy: "code", baseCents: 27540, ratePct: 10 })).toBe(true);
    expect(callArgs(q, "insert")?.[0]).toEqual({ partner_id: "p1", order_id: "o1", attributed_by: "code", base_cents: 27540, rate_pct: 10, amount_cents: 2754, state: "pending" });
    expect(rpc).toHaveBeenCalledWith("adjust_partner_lifetime", { p_partner: "p1", p_delta: 27540 });
    from = fromQueue({ commissions: [query({ error: { code: "23505" } })] });
    rpc.mockClear();
    expect(await createCommission({ partnerId: "p1", orderId: "o1", attributedBy: "code", baseCents: 27540, ratePct: 10 })).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("markCommissionClearing starts the 15-day hold from the ship time", async () => {
    const q = query({});
    from = fromQueue({ commissions: [q] });
    const { markCommissionClearing } = await import("@/lib/partners/ledger");
    await markCommissionClearing("o1", "2026-10-01T12:00:00.000Z");
    expect(callArgs(q, "update")?.[0]).toEqual({ state: "clearing", clears_at: "2026-10-16T12:00:00.000Z" });
    expect(q.calls.filter(([m]) => m === "eq").map(([, a]) => a)).toEqual([["order_id", "o1"], ["state", "pending"]]);
  });

  it("reverseCommission voids unpaid commission and removes it from lifetime sales", async () => {
    const find = query({ data: { id: "c1", partner_id: "p1", state: "clearing", amount_cents: 2754, base_cents: 27540 } });
    const adj = query({ data: [] });
    const upd = query({ data: [{ id: "c1" }] });
    from = fromQueue({ commissions: [find, upd], commission_adjustments: [adj] });
    const { reverseCommission } = await import("@/lib/partners/ledger");
    await reverseCommission("o1", "refund");
    expect(callArgs(upd, "update")?.[0]).toMatchObject({ state: "void", voided_at: expect.any(String) });
    expect(rpc).toHaveBeenCalledWith("adjust_partner_lifetime", { p_partner: "p1", p_delta: -27540 });
  });

  it("reverseCommission deducts already-paid commission from the next payout, once", async () => {
    const find = query({ data: { id: "c1", partner_id: "p1", state: "paid", amount_cents: 2754, base_cents: 27540 } });
    const adjFind = query({ data: [] });
    const adjIns = query({});
    from = fromQueue({ commissions: [find], commission_adjustments: [adjFind, adjIns] });
    const { reverseCommission } = await import("@/lib/partners/ledger");
    await reverseCommission("o1", "chargeback");
    expect(callArgs(adjIns, "insert")?.[0]).toEqual({ partner_id: "p1", order_id: "o1", amount_cents: -2754, reason: "chargeback" });
    from = fromQueue({ commissions: [query({ data: { id: "c1", partner_id: "p1", state: "paid", amount_cents: 2754, base_cents: 27540 } })], commission_adjustments: [query({ data: [{ id: "a1" }] })] });
    rpc.mockClear();
    await reverseCommission("o1", "refund"); // already deducted for this order
    expect(rpc).not.toHaveBeenCalled();
  });

  it("spendCredit and creditBalance use the ledger", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    from = fromQueue({ store_credit_ledger: [query({ data: [{ amount_cents: 17730 }, { amount_cents: -5000 }] })] });
    const { spendCredit, creditBalance } = await import("@/lib/partners/ledger");
    expect(await spendCredit("u1", 1000, "o1")).toBe(true);
    expect(rpc).toHaveBeenCalledWith("spend_store_credit", { p_customer: "u1", p_cents: 1000, p_order: "o1" });
    expect(await creditBalance("u1")).toBe(12730);
  });

  it("runPayouts is a no-op when the run date already exists", async () => {
    from = fromQueue({ payout_runs: [query({ error: { code: "23505" } })] });
    const { runPayouts } = await import("@/lib/partners/ledger");
    expect(await runPayouts("2026-10-15")).toEqual({ skipped: true, results: [] });
  });

  it("runPayouts settles payable commission: split partner gets credit now and cash carried under $100", async () => {
    const runIns = query({});
    const runDone = query({});
    const partnersSel = query({ data: [{ id: "p1", customer_id: "u1", payout_pref: "split", split_cash_pct: 50, cash_carry_cents: 0, w9_checked_at: null, payout_method: "ach" }] });
    const partnerUpd = query({});
    const commSel = query({ data: [{ id: "c1", amount_cents: 10800 }] });
    const commUpd = query({});
    const adjSel = query({ data: [] });
    const payoutIns = query({ data: { id: "po1" } });
    const creditIns = query({});
    from = fromQueue({
      payout_runs: [runIns, runDone], partners: [partnersSel, partnerUpd], commissions: [commSel, commUpd],
      commission_adjustments: [adjSel], payouts: [payoutIns], store_credit_ledger: [creditIns],
    });
    const { runPayouts } = await import("@/lib/partners/ledger");
    const r = await runPayouts("2026-10-15");
    expect(r).toEqual({ skipped: false, results: [{ partnerId: "p1", cashCents: 0, creditValueCents: 7020, carryCents: 5400 }] });
    expect(callArgs(commUpd, "update")?.[0]).toMatchObject({ state: "paid", payout_run: "2026-10-15" });
    expect(callArgs(partnerUpd, "update")?.[0]).toEqual({ cash_carry_cents: 5400 });
    expect(callArgs(payoutIns, "insert")?.[0]).toEqual({ partner_id: "p1", run_date: "2026-10-15", cash_cents: 0, credit_cents: 7020, status: "credited", method: "ach" });
    expect(callArgs(creditIns, "insert")?.[0]).toEqual({ customer_id: "u1", amount_cents: 7020, reason: "payout", ref_id: "po1" });
  });
});
