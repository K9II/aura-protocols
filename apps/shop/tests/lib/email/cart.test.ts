import { describe, it, expect, vi } from "vitest";
import { query, fromQueue } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));

describe("listAbandonedCheckouts", () => {
  it("only looks at sale checkouts (a no-charge order never gets a cart reminder) and keeps a customer's newest", async () => {
    const list = query({ data: [{ id: "o1", customer_id: "c1", created_at: "2026-10-06T10:00:00Z" }] });
    const newer = query({ count: 0 });
    from = fromQueue({ orders: [list, newer] });
    const { listAbandonedCheckouts } = await import("@/lib/email/cart");
    expect((await listAbandonedCheckouts(Date.parse("2026-10-06T14:00:00Z"))).map((o) => o.id)).toEqual(["o1"]);
    expect(list.calls).toContainEqual(["eq", ["status", "awaiting_payment"]]);
    expect(list.calls).toContainEqual(["eq", ["kind", "sale"]]);
    // A newer no-charge order doesn't stand in for the customer's newest checkout.
    expect(newer.calls).toContainEqual(["eq", ["kind", "sale"]]);
  });
});
