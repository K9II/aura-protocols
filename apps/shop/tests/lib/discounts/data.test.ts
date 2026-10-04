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
});
