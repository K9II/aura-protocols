import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const rpc = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), rpc }) }));

describe("discount data", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); });

  it("getDiscountCap reads shop_settings and throws when it can't", async () => {
    from = fromQueue({ shop_settings: [query({ data: { max_discount_pct: 30 } }), query({ error: { message: "down" } })] });
    const { getDiscountCap } = await import("@/lib/discounts/data");
    expect(await getDiscountCap()).toBe(30);
    await expect(getDiscountCap()).rejects.toThrow(/down/);
  });

  it("claimCode passes the order, customer, discount and cap trim", async () => {
    rpc.mockResolvedValue({ data: "used_up", error: null });
    const { claimCode } = await import("@/lib/discounts/data");
    expect(await claimCode({ codeId: "c1", orderId: "o1", customerId: "u1", discountCents: 7900, cappedCents: 4740 })).toBe("used_up");
    expect(rpc).toHaveBeenCalledWith("claim_discount_code", { p_code: "c1", p_order: "o1", p_customer: "u1", p_discount: 7900, p_capped: 4740 });
  });

  it("claimCode throws on an RPC error or an unknown answer", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } }).mockResolvedValueOnce({ data: "weird", error: null });
    const { claimCode } = await import("@/lib/discounts/data");
    const args = { codeId: "c1", orderId: "o1", customerId: "u1", discountCents: 0, cappedCents: 0 };
    await expect(claimCode(args)).rejects.toThrow(/boom/);
    await expect(claimCode(args)).rejects.toThrow(/weird/);
  });

  it("findCodeByText normalizes the typed code", async () => {
    const q = query({ data: null });
    from = fromQueue({ discount_codes: [q] });
    const { findCodeByText } = await import("@/lib/discounts/data");
    expect(await findCodeByText(" spring20 ")).toBeNull();
    expect(callArgs(q, "eq")).toEqual(["code", "SPRING20"]);
  });

  it("codeAttemptAllowed refuses at 10 failures in 10 minutes for the account or the network", async () => {
    from = fromQueue({ code_attempts: [query({ count: 10 })] });
    const { codeAttemptAllowed } = await import("@/lib/discounts/data");
    expect(await codeAttemptAllowed("u1", "h1")).toBe(false);
    from = fromQueue({ code_attempts: [query({ count: 2 }), query({ count: 10 })] });
    expect(await codeAttemptAllowed("u1", "h1")).toBe(false);
    from = fromQueue({ code_attempts: [query({ count: 2 }), query({ count: 3 })] });
    expect(await codeAttemptAllowed("u1", "h1")).toBe(true);
  });

  it("isDiscountCodeTaken checks discount codes and partner codes", async () => {
    from = fromQueue({ discount_codes: [query({ data: null })], partners: [query({ data: { id: "p1" } })] });
    const { isDiscountCodeTaken } = await import("@/lib/discounts/data");
    expect(await isDiscountCodeTaken("SMITHLAB")).toBe(true);
  });

  it("resetUse only resets a used redemption on a refunded order", async () => {
    from = fromQueue({ code_redemptions: [query({ data: { id: "r1", code_id: "c1", state: "used", orders: { status: "paid" } } })] });
    const { resetUse } = await import("@/lib/discounts/data");
    expect(await resetUse("r1", "owner")).toBe(false);
  });

  it("useCounts asks the SQL function once, however big the batch", async () => {
    rpc.mockResolvedValue({ data: { total: 3, mine: 1 }, error: null });
    const { useCounts } = await import("@/lib/discounts/data");
    expect(await useCounts({ id: "c1", batch_id: "b1" }, "u1")).toEqual({ total: 3, mine: 1 });
    expect(rpc).toHaveBeenCalledWith("discount_code_use_counts", { p_code: "c1", p_customer: "u1" });
  });

  it("listCodes pages past PostgREST's 1,000-row limit", async () => {
    const page1 = query({ data: Array.from({ length: 1000 }, (_, i) => ({ id: `c${i}` })) });
    const page2 = query({ data: [{ id: "last" }] });
    from = fromQueue({ discount_codes: [page1, page2] });
    const { listCodes } = await import("@/lib/discounts/data");
    expect(await listCodes()).toHaveLength(1001);
    expect(callArgs(page2, "range")).toEqual([1000, 1999]);
  });

  it("listBatches also pages past PostgREST's 1,000-row limit", async () => {
    const page1 = query({ data: Array.from({ length: 1000 }, (_, i) => ({ id: `b${i}` })) });
    const page2 = query({ data: [{ id: "last" }] });
    from = fromQueue({ discount_batches: [page1, page2] });
    const { listBatches } = await import("@/lib/discounts/data");
    expect(await listBatches()).toHaveLength(1001);
    expect(callArgs(page2, "range")).toEqual([1000, 1999]);
  });

  it("updateBatch also writes the batch's own note when the patch includes one", async () => {
    const codesUpd = query({});
    const batchUpd = query({});
    const event = query({});
    from = fromQueue({ discount_codes: [codesUpd], discount_batches: [batchUpd], discount_code_events: [event] });
    const { updateBatch } = await import("@/lib/discounts/data");
    await updateBatch("b1", { note: "New note" } as never, "Rule edited", "owner");
    expect(callArgs(batchUpd, "update")).toEqual([{ note: "New note" }]);
    expect(callArgs(batchUpd, "eq")).toEqual(["id", "b1"]);
  });

  it("updateBatch skips the note write when the patch has no note (batch-locked fields omitted)", async () => {
    const codesUpd = query({});
    const event = query({});
    from = fromQueue({ discount_codes: [codesUpd], discount_code_events: [event] });
    const { updateBatch } = await import("@/lib/discounts/data");
    await updateBatch("b1", { value: 30 } as never, "Rule edited", "owner");
    // No discount_batches entry was queued — a from("discount_batches") call would throw "unexpected".
  });

  it("updateBatch throws when the note write fails", async () => {
    const codesUpd = query({});
    const batchUpd = query({ error: { message: "down" } });
    from = fromQueue({ discount_codes: [codesUpd], discount_batches: [batchUpd] });
    const { updateBatch } = await import("@/lib/discounts/data");
    await expect(updateBatch("b1", { note: "x" } as never, "Rule edited", "owner")).rejects.toThrow(/down/);
  });

  it("insertBatch removes the whole batch when a chunk fails", async () => {
    const del1 = query({}); const del2 = query({});
    from = fromQueue({
      discount_batches: [query({ data: { id: "b1" } }), del2],
      discount_codes: [query({}), query({ error: { code: "23505" } }), del1],
    });
    const { insertBatch } = await import("@/lib/discounts/data");
    const codes = Array.from({ length: 600 }, (_, i) => `VIP-${i}`);
    expect(await insertBatch("VIP-", codes, {} as never, "owner")).toEqual({ error: "taken" });
    expect(callArgs(del1, "eq")).toEqual(["batch_id", "b1"]);
    expect(callArgs(del2, "eq")).toEqual(["id", "b1"]);
  });
});
