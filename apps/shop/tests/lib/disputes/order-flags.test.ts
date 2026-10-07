import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
vi.mock("@/lib/notify", () => ({ alertOwner: vi.fn() }));

describe("orderFlags", () => {
  beforeEach(() => vi.resetModules());

  it("returns orders with an open dispute and orders with an open warning", async () => {
    const d = query({ data: [{ order_id: "o1" }] });
    const w = query({ data: [{ order_id: "o2" }] });
    from = fromQueue({ disputes: [d], early_fraud_warnings: [w] });
    const { orderFlags } = await import("@/lib/disputes/data");
    const f = await orderFlags(["o1", "o2", "o3"]);
    expect([...f.disputes]).toEqual(["o1"]);
    expect([...f.warnings]).toEqual(["o2"]);
    expect(callArgs(d, "is")).toEqual(["closed_at", null]);
    expect(callArgs(w, "is")).toEqual(["resolved_at", null]);
  });

  it("is cosmetic: a read error tags nothing", async () => {
    from = fromQueue({ disputes: [query({ error: { message: "x" } })], early_fraud_warnings: [query({})] });
    const { orderFlags } = await import("@/lib/disputes/data");
    const f = await orderFlags(["o1"]);
    expect(f.disputes.size + f.warnings.size).toBe(0);
  });

  it("skips the query for no ids", async () => {
    from = fromQueue({});
    const { orderFlags } = await import("@/lib/disputes/data");
    expect((await orderFlags([])).disputes.size).toBe(0);
  });
});
