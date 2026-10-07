import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));

import { stampRefund, creditCardPart } from "@/lib/refunds/data";

const fields = { destination: "store_credit" as const, reason: "goodwill" as const, note: "held 3 weeks", by: "u1", stripeRefundId: null };

describe("refunds/data", () => {
  beforeEach(() => { from = fromQueue({}); });

  it("stampRefund records who, why and where — first writer wins", async () => {
    const q = query();
    from = fromQueue({ orders: [q] });
    await stampRefund("o1", fields);
    expect(callArgs(q, "update")).toEqual([{ refund_destination: "store_credit", refund_reason: "goodwill", refund_note: "held 3 weeks", refunded_by: "u1", stripe_refund_id: null }]);
    expect(callArgs(q, "eq")).toEqual(["id", "o1"]);
    expect(callArgs(q, "is")).toEqual(["refund_reason", null]);
  });

  it("stampRefund throws on a DB error", async () => {
    from = fromQueue({ orders: [query({ error: { message: "boom" } })] });
    await expect(stampRefund("o1", fields)).rejects.toThrow(/boom/);
  });

  it("creditCardPart inserts one refund_to_credit row", async () => {
    const q = query();
    from = fromQueue({ store_credit_ledger: [q] });
    await creditCardPart("c1", 18800, "o1");
    expect(callArgs(q, "insert")).toEqual([{ customer_id: "c1", amount_cents: 18800, reason: "refund_to_credit", ref_id: "o1", note: "Refund (card part) as store credit" }]);
  });

  it("creditCardPart ignores a duplicate and skips zero", async () => {
    from = fromQueue({ store_credit_ledger: [query({ error: { code: "23505" } })] });
    await expect(creditCardPart("c1", 18800, "o1")).resolves.toBeUndefined();
    from = fromQueue({});
    await expect(creditCardPart("c1", 0, "o1")).resolves.toBeUndefined();
    expect(from).not.toHaveBeenCalled();
  });

  it("creditCardPart throws on other errors", async () => {
    from = fromQueue({ store_credit_ledger: [query({ error: { code: "42P01", message: "nope" } })] });
    await expect(creditCardPart("c1", 100, "o1")).rejects.toThrow(/nope/);
  });
});
