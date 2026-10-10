import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const rpc = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), rpc }) }));

describe("partner ledger", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); rpc.mockResolvedValue({ data: null, error: null }); });

  it("createCommission calls the transactional record_commission RPC", async () => {
    from = fromQueue({});
    rpc.mockResolvedValue({ data: true, error: null });
    const { createCommission } = await import("@/lib/partners/ledger");
    expect(await createCommission({ partnerId: "p1", orderId: "o1", attributedBy: "code", baseCents: 27540, ratePct: 10 })).toBe(true);
    expect(rpc).toHaveBeenCalledWith("record_commission", {
      p_order: "o1", p_partner: "p1", p_base_cents: 27540, p_pct: 10, p_amount_cents: 2754, p_attributed_by: "code",
    });
  });

  it("createCommission returns false when the RPC reports no insert, and throws on a DB error", async () => {
    from = fromQueue({});
    rpc.mockResolvedValue({ data: false, error: null });
    const { createCommission } = await import("@/lib/partners/ledger");
    expect(await createCommission({ partnerId: "p1", orderId: "o1", attributedBy: "code", baseCents: 27540, ratePct: 10 })).toBe(false);
    rpc.mockResolvedValue({ data: null, error: { message: "connection reset" } });
    await expect(createCommission({ partnerId: "p1", orderId: "o1", attributedBy: "code", baseCents: 27540, ratePct: 10 })).rejects.toThrow(/record_commission/);
  });

  it("markCommissionClearing starts the 15-day hold from the ship time and surfaces a DB error", async () => {
    const q = query({});
    from = fromQueue({ commissions: [q] });
    const { markCommissionClearing } = await import("@/lib/partners/ledger");
    await markCommissionClearing("o1", "2026-10-01T12:00:00.000Z");
    expect(callArgs(q, "update")?.[0]).toEqual({ state: "clearing", clears_at: "2026-10-16T12:00:00.000Z" });
    expect(q.calls.filter(([m]) => m === "eq").map(([, a]) => a)).toEqual([["order_id", "o1"], ["state", "pending"]]);

    from = fromQueue({ commissions: [query({ error: { message: "timeout" } })] });
    await expect(markCommissionClearing("o1", "2026-10-01T12:00:00.000Z")).rejects.toThrow(/mark commission clearing/);
  });

  it("reverseCommission calls the transactional reverse_commission RPC and surfaces a DB error", async () => {
    from = fromQueue({});
    rpc.mockResolvedValue({ data: "voided", error: null });
    const { reverseCommission } = await import("@/lib/partners/ledger");
    await reverseCommission("o1", "refund");
    expect(rpc).toHaveBeenCalledWith("reverse_commission", { p_order: "o1", p_reason: "refund" });

    rpc.mockResolvedValue({ data: null, error: { message: "deadlock" } });
    await expect(reverseCommission("o1", "chargeback")).rejects.toThrow(/reverse_commission/);
  });

  it("spendCredit and creditBalance use the ledger; zero/negative spends are a no-op", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    from = fromQueue({ store_credit_ledger: [query({ data: [{ amount_cents: 17730 }, { amount_cents: -5000 }] })] });
    const { spendCredit, creditBalance } = await import("@/lib/partners/ledger");
    expect(await spendCredit("u1", 1000, "o1")).toBe(true);
    expect(rpc).toHaveBeenCalledWith("spend_store_credit", { p_customer: "u1", p_cents: 1000, p_order: "o1" });
    expect(await creditBalance("u1")).toBe(12730);

    rpc.mockClear();
    expect(await spendCredit("u1", 0, "o2")).toBe(true);
    expect(await spendCredit("u1", -5, "o3")).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refundCredit is a no-op for zero/negative amounts and otherwise inserts", async () => {
    const ins = query({});
    from = fromQueue({ store_credit_ledger: [ins] });
    const { refundCredit } = await import("@/lib/partners/ledger");
    await refundCredit("u1", 0, "o1");
    await refundCredit("u1", -100, "o1");
    expect(from).not.toHaveBeenCalled();

    from = fromQueue({ store_credit_ledger: [ins] });
    await refundCredit("u1", 500, "o1");
    expect(callArgs(ins, "insert")?.[0]).toEqual({ customer_id: "u1", amount_cents: 500, reason: "order_refund", ref_id: "o1" });
  });

  it("creditBalance surfaces a DB error", async () => {
    from = fromQueue({ store_credit_ledger: [query({ error: { message: "down" } })] });
    const { creditBalance } = await import("@/lib/partners/ledger");
    await expect(creditBalance("u1")).rejects.toThrow(/credit balance select/);
  });

  it("runPayouts is a true no-op only when a prior run already finished", async () => {
    from = fromQueue({ payout_runs: [query({ error: { code: "23505" } }), query({ data: { finished_at: "2026-10-15T09:00:00.000Z" } })] });
    const { runPayouts } = await import("@/lib/partners/ledger");
    expect(await runPayouts("2026-10-15")).toEqual({ skipped: true, results: [], failures: [] });
  });

  it("runPayouts resumes a started-but-unfinished run instead of skipping it", async () => {
    const partnersSel = query({ data: [] });
    const donePayouts = query({ data: [] });
    const runDone = query({});
    from = fromQueue({
      payout_runs: [query({ error: { code: "23505" } }), query({ data: { finished_at: null } }), runDone],
      partners: [partnersSel], payouts: [donePayouts],
    });
    const { runPayouts } = await import("@/lib/partners/ledger");
    const r = await runPayouts("2026-10-15");
    expect(r).toEqual({ skipped: false, results: [], failures: [] });
    expect(callArgs(runDone, "update")?.[0]).toMatchObject({ finished_at: expect.any(String), error: null });
  });

  it("runPayouts throws if the initial partners select errors", async () => {
    const runIns = query({});
    from = fromQueue({ payout_runs: [runIns], partners: [query({ error: { message: "down" } })] });
    const { runPayouts } = await import("@/lib/partners/ledger");
    await expect(runPayouts("2026-10-15")).rejects.toThrow(/partners select/);
  });

  it("runPayouts settles payable commission via apply_partner_payout: split partner gets credit now and cash carried under $100", async () => {
    const runIns = query({});
    const runDone = query({});
    const partnersSel = query({ data: [{ id: "p1", customer_id: "u1", payout_pref: "split", split_cash_pct: 50, cash_carry_cents: 0, w9_checked_at: null, payout_method: "ach" }] });
    const donePayouts = query({ data: [] });
    const commSel = query({ data: [{ id: "c1", amount_cents: 10800 }] });
    const adjSel = query({ data: [] });
    from = fromQueue({
      payout_runs: [runIns, runDone], partners: [partnersSel], payouts: [donePayouts],
      commissions: [commSel], commission_adjustments: [adjSel],
    });
    rpc.mockResolvedValue({ data: null, error: null });
    const { runPayouts } = await import("@/lib/partners/ledger");
    const r = await runPayouts("2026-10-15");
    expect(r).toEqual({ skipped: false, results: [{ partnerId: "p1", cashCents: 0, creditValueCents: 7020, carryCents: 5400 }], failures: [] });
    expect(rpc).toHaveBeenCalledWith("apply_partner_payout", {
      p_partner: "p1", p_run_date: "2026-10-15", p_commission_ids: ["c1"], p_adjustment_ids: [],
      p_expected_carry: 0, p_cash_cents: 0, p_credit_value_cents: 7020, p_new_carry: 5400, p_method: "ach", p_customer: "u1",
    });
    expect(callArgs(runDone, "update")?.[0]).toMatchObject({ finished_at: expect.any(String), error: null });
  });

  it("runPayouts nets an unsettled deduction against payable commission before splitting", async () => {
    const runIns = query({});
    const runDone = query({});
    const partnersSel = query({ data: [{ id: "p1", customer_id: "u1", payout_pref: "cash", split_cash_pct: 100, cash_carry_cents: 0, w9_checked_at: "2026-01-01T00:00:00.000Z", payout_method: "ach", payout_details_hint: "ACH · checking ••••6789 · Test Bank" }] });
    const donePayouts = query({ data: [] });
    const snapshot = query({});
    const commSel = query({ data: [{ id: "c1", amount_cents: 20000 }] });
    const adjSel = query({ data: [{ id: "a1", amount_cents: -5000 }] });
    from = fromQueue({
      payout_runs: [runIns, runDone], partners: [partnersSel], payouts: [donePayouts, snapshot],
      commissions: [commSel], commission_adjustments: [adjSel],
    });
    rpc.mockResolvedValue({ data: null, error: null });
    const { runPayouts } = await import("@/lib/partners/ledger");
    const r = await runPayouts("2026-10-15");
    // net = 20000 - 5000 = 15000 >= CASH_MIN_CENTS(10000), w9 checked → paid as cash.
    expect(r.results).toEqual([{ partnerId: "p1", cashCents: 15000, creditValueCents: 0, carryCents: 0 }]);
    expect(rpc).toHaveBeenCalledWith("apply_partner_payout", expect.objectContaining({
      p_commission_ids: ["c1"], p_adjustment_ids: ["a1"], p_cash_cents: 15000, p_credit_value_cents: 0, p_new_carry: 0,
    }));
    // the masked details the cash is going to, so a later change is flagged on the Payouts page
    expect(callArgs(snapshot, "update")?.[0]).toEqual({ details_hint: "ACH · checking ••••6789 · Test Bank" });
  });

  it("runPayouts isolates one partner's apply_partner_payout failure: others still process, but finished_at stays null so the run can be retried", async () => {
    const runIns = query({});
    const runDone = query({});
    const PARTNERS_DATA = [
      { id: "p1", customer_id: "u1", payout_pref: "cash", split_cash_pct: 100, cash_carry_cents: 0, w9_checked_at: "2026-01-01T00:00:00.000Z", payout_method: "ach" },
      { id: "p2", customer_id: "u2", payout_pref: "cash", split_cash_pct: 100, cash_carry_cents: 0, w9_checked_at: "2026-01-01T00:00:00.000Z", payout_method: "ach" },
    ];
    const partnersSel = query({ data: PARTNERS_DATA });
    const donePayouts = query({ data: [] });
    const comm1 = query({ data: [{ id: "c1", amount_cents: 20000 }] });
    const adj1 = query({ data: [] });
    const comm2 = query({ data: [{ id: "c2", amount_cents: 20000 }] });
    const adj2 = query({ data: [] });
    from = fromQueue({
      payout_runs: [runIns, runDone], partners: [partnersSel], payouts: [donePayouts, query({})],  // + p2's details snapshot
      commissions: [comm1, comm2], commission_adjustments: [adj1, adj2],
    });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "carry changed for partner p1" } })
       .mockResolvedValueOnce({ data: null, error: null });
    const { runPayouts } = await import("@/lib/partners/ledger");
    const r = await runPayouts("2026-10-15");
    expect(r.skipped).toBe(false);
    expect(r.failures).toEqual([{ partnerId: "p1", error: expect.stringContaining("apply_partner_payout") }]);
    expect(r.results).toEqual([{ partnerId: "p2", cashCents: 20000, creditValueCents: 0, carryCents: 0 }]);
    // finished_at is left unset (not just null-valued) so the row still reads as unfinished on a resume.
    expect(callArgs(runDone, "update")?.[0]).toEqual({ error: expect.stringContaining("p1") });
    expect(callArgs(runDone, "update")?.[0]).not.toHaveProperty("finished_at");

    // A same-day rerun: the insert conflicts, finished_at reads back null, so it resumes.
    // p2 already has a payouts row for this run_date and is skipped; only p1 is retried.
    const rerunDup = query({ error: { code: "23505" } });
    const rerunLookup = query({ data: { finished_at: null } });
    const rerunFinish = query({});
    const partnersSel2 = query({ data: PARTNERS_DATA });
    const alreadyDone2 = query({ data: [{ partner_id: "p2" }] });
    const comm1Retry = query({ data: [{ id: "c1", amount_cents: 20000 }] });
    const adj1Retry = query({ data: [] });
    from = fromQueue({
      payout_runs: [rerunDup, rerunLookup, rerunFinish], partners: [partnersSel2], payouts: [alreadyDone2, query({})],
      commissions: [comm1Retry], commission_adjustments: [adj1Retry],
    });
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
    const r2 = await runPayouts("2026-10-15");
    expect(r2.skipped).toBe(false);
    expect(r2.failures).toEqual([]);
    expect(r2.results).toEqual([{ partnerId: "p1", cashCents: 20000, creditValueCents: 0, carryCents: 0 }]);
    expect(callArgs(rerunFinish, "update")?.[0]).toMatchObject({ finished_at: expect.any(String), error: null });
  });

  it("listUnfinishedPayoutRuns finds run dates before today that never finished, and surfaces a DB error", async () => {
    const q = query({ data: [{ run_date: "2026-09-15" }, { run_date: "2026-09-01" }] });
    from = fromQueue({ payout_runs: [q] });
    const { listUnfinishedPayoutRuns } = await import("@/lib/partners/ledger");
    expect(await listUnfinishedPayoutRuns("2026-10-07")).toEqual(["2026-09-15", "2026-09-01"]);
    expect(callArgs(q, "is")).toEqual(["finished_at", null]);
    expect(callArgs(q, "lt")).toEqual(["run_date", "2026-10-07"]);

    from = fromQueue({ payout_runs: [query({ error: { message: "down" } })] });
    await expect(listUnfinishedPayoutRuns("2026-10-07")).rejects.toThrow(/unfinished payout runs/);
  });

  it("sweepShippedCommissions moves pending commissions for shipped orders onto the clearing timer, isolating one order's failure", async () => {
    const sel = query({
      data: [
        { order_id: "o1", orders: { status: "shipped", shipped_at: "2026-10-01T00:00:00.000Z" } },
        { order_id: "o2", orders: { status: "shipped", shipped_at: null } },
      ],
    });
    const upd1 = query({});
    const upd2 = query({ error: { message: "timeout" } });
    from = fromQueue({ commissions: [sel, upd1, upd2] });
    const { sweepShippedCommissions } = await import("@/lib/partners/ledger");
    const r = await sweepShippedCommissions();
    expect(callArgs(upd1, "update")?.[0]).toMatchObject({ state: "clearing", clears_at: "2026-10-16T00:00:00.000Z" });
    expect(callArgs(upd2, "update")?.[0]).toMatchObject({ state: "clearing" });
    expect(r.swept).toBe(1);
    expect(r.errors).toEqual([expect.stringContaining("o2")]);

    from = fromQueue({ commissions: [query({ error: { message: "down" } })] });
    await expect(sweepShippedCommissions()).rejects.toThrow(/sweep shipped commissions/);
  });

  it("latestRunSummary reports whether the run finished and carries its error", async () => {
    const runQ = query({ data: { run_date: "2026-10-15", error: null, finished_at: "2026-10-15T09:00:00.000Z" } });
    const payQ = query({ data: [{ credit_cents: 500 }, { credit_cents: 250 }] });
    from = fromQueue({ payout_runs: [runQ], payouts: [payQ] });
    const { latestRunSummary } = await import("@/lib/partners/ledger");
    expect(await latestRunSummary()).toEqual({ runDate: "2026-10-15", creditCents: 750, creditPartners: 2, finished: true, error: null });

    const failJson = JSON.stringify([{ partnerId: "p1", error: "timeout" }]);
    from = fromQueue({ payout_runs: [query({ data: { run_date: "2026-10-01", error: failJson, finished_at: null } })], payouts: [query({ data: [] })] });
    expect(await latestRunSummary()).toEqual({ runDate: "2026-10-01", creditCents: 0, creditPartners: 0, finished: false, error: failJson });

    from = fromQueue({ payout_runs: [query({ error: { message: "down" } })] });
    await expect(latestRunSummary()).rejects.toThrow(/latest run select/);
  });

  it("payoutRunWarning is null for a clean finished run, and describes an unfinished/errored one with a human-formatted date", async () => {
    const { payoutRunWarning } = await import("@/lib/partners/ledger");
    expect(payoutRunWarning(null)).toBeNull();
    expect(payoutRunWarning({ runDate: "2026-10-15", finished: true, error: null })).toBeNull();

    const failJson = JSON.stringify([{ partnerId: "p1", error: "timeout" }, { partnerId: "p2", error: "insert failed" }]);
    expect(payoutRunWarning({ runDate: "2026-10-01", finished: false, error: failJson })).toBe(
      "The payout run for Oct 1, 2026 didn't finish — 2 partners failed. It will retry automatically in tonight's daily run; details: timeout; insert failed",
    );

    expect(payoutRunWarning({ runDate: "2026-10-01", finished: false, error: "boom" })).toBe(
      "The payout run for Oct 1, 2026 didn't finish — some partners failed. It will retry automatically in tonight's daily run; details: boom",
    );

    expect(payoutRunWarning({ runDate: "2026-10-01", finished: false, error: null })).toBe(
      "The payout run for Oct 1, 2026 didn't finish — some partners failed. It will retry automatically in tonight's daily run; details: no error recorded",
    );
  });

  it("formatRunDate formats a date-only ISO string as UTC so it never shifts a day", async () => {
    const { formatRunDate } = await import("@/lib/partners/ledger");
    expect(formatRunDate("2026-10-01")).toBe("Oct 1, 2026");
  });

  it("payableByPartner totals payable commission per partner", async () => {
    from = fromQueue({ commissions: [query({ data: [{ partner_id: "p1", amount_cents: 4410 }, { partner_id: "p1", amount_cents: 1000 }, { partner_id: "p2", amount_cents: 212 }] })] });
    const { payableByPartner } = await import("@/lib/partners/ledger");
    expect(await payableByPartner()).toEqual({ p1: 5410, p2: 212 });
  });

  it("listPayoutHistory pages paid and credited payouts newest first", async () => {
    const q = query({ data: [{ id: "y1" }], count: 14 });
    from = fromQueue({ payouts: [q] });
    const { listPayoutHistory } = await import("@/lib/partners/ledger");
    expect(await listPayoutHistory(2)).toEqual({ rows: [{ id: "y1" }], total: 14 });
    expect(callArgs(q, "in")).toEqual(["status", ["paid", "credited"]]);
    expect(q.calls.filter(([m]) => m === "order").map(([, a]) => a)).toEqual([
      ["run_date", { ascending: false }], ["paid_at", { ascending: false }], ["id"],
    ]);
    expect(callArgs(q, "range")).toEqual([50, 99]);
  });

  it("countPayoutHistory is a cheap head count of paid and credited payouts", async () => {
    from = fromQueue({ payouts: [query({ count: 14 })] });
    const { countPayoutHistory } = await import("@/lib/partners/ledger");
    expect(await countPayoutHistory()).toBe(14);

    from = fromQueue({ payouts: [query({ error: { message: "down" } })] });
    await expect(countPayoutHistory()).rejects.toThrow(/payout history count/);
  });

  it("payableByPartner throws on a read error", async () => {
    from = fromQueue({ commissions: [query({ error: { message: "x" } })] });
    const { payableByPartner } = await import("@/lib/partners/ledger");
    await expect(payableByPartner()).rejects.toThrow(/payable select failed/);
  });
});
