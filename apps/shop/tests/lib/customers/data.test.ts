import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

const rpc = vi.fn(), getUserById = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), rpc, auth: { admin: { getUserById } } }) }));

describe("customers data", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); getUserById.mockReset(); });

  it("lists a page through admin_customer_list and reads the total", async () => {
    rpc.mockResolvedValue({ data: [{ id: "u1", email: "a@b.co", full_name: "A", organization: null, is_owner: false, created_at: "2026-10-01T00:00:00Z", email_verified_at: null, blocked_at: null, is_partner: false, paid_orders: 0, spent_cents: "0", last_order_at: null, credit_cents: "0", total_count: "41" }], error: null });
    const { listCustomers } = await import("@/lib/customers/data");
    const r = await listCustomers({ q: "a@b", tab: "all", page: 2 });
    expect(rpc).toHaveBeenCalledWith("admin_customer_list", { p_q: "a@b", p_tab: "all", p_limit: 50, p_offset: 50 });
    expect(r.total).toBe(41);
    expect(r.rows[0]).toMatchObject({ id: "u1", spentCents: 0, creditCents: 0, verified: false, blocked: false });
  });

  it("an empty page still knows there are no rows", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const { listCustomers } = await import("@/lib/customers/data");
    expect(await listCustomers({ q: "", tab: "blocked", page: 1 })).toEqual({ rows: [], total: 0 });
  });

  it("throws on an RPC error (never an empty list)", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { listCustomers } = await import("@/lib/customers/data");
    await expect(listCustomers({ q: "", tab: "all", page: 1 })).rejects.toThrow(/customer list failed/);
  });

  it("adjustCredit maps insufficient_credit to a refusal", async () => {
    rpc.mockResolvedValueOnce({ data: "e1", error: null }).mockResolvedValueOnce({ data: null, error: { message: "insufficient_credit" } });
    const { adjustCredit } = await import("@/lib/customers/data");
    expect(await adjustCredit("u1", 5000, "seeding", "samples", "owner")).toEqual({ ok: true, eventId: "e1" });
    expect(rpc).toHaveBeenCalledWith("admin_adjust_credit", { p_customer: "u1", p_amount: 5000, p_category: "seeding", p_note: "samples", p_actor: "owner" });
    expect(await adjustCredit("u1", -9999, "correction", null, "owner")).toEqual({ ok: false, reason: "insufficient" });
  });

  it("setBlockedFields writes both columns; logCustomerEvent inserts and throws on error", async () => {
    const upd = query({}), ins = query({ error: { message: "nope" } });
    from = fromQueue({ customers: [upd], customer_events: [ins] });
    const { setBlockedFields, logCustomerEvent } = await import("@/lib/customers/data");
    await setBlockedFields("u1", { at: "2026-10-04T00:00:00Z", reason: "fraud" });
    expect(callArgs(upd, "update")).toEqual([{ blocked_at: "2026-10-04T00:00:00Z", blocked_reason: "fraud" }]);
    await expect(logCustomerEvent({ customerId: "u1", kind: "blocked", reason: "fraud", actorId: "owner" })).rejects.toThrow(/customer event/);
  });
});
