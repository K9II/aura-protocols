import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const rpc = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), rpc }) }));

describe("account data", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); });

  it("accountIdByEmail asks the SQL function with a normalized email", async () => {
    rpc.mockResolvedValue({ data: "u1", error: null });
    const { accountIdByEmail } = await import("@/lib/account/data");
    expect(await accountIdByEmail(" Jane@Lab.org ")).toBe("u1");
    expect(rpc).toHaveBeenCalledWith("account_id_by_email", { p_email: "jane@lab.org" });
  });

  it("accountIdByEmail returns null for an unknown email and throws on error", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: null, error: { message: "down" } });
    const { accountIdByEmail } = await import("@/lib/account/data");
    expect(await accountIdByEmail("x@y.co")).toBeNull();
    await expect(accountIdByEmail("x@y.co")).rejects.toThrow(/down/);
  });

  it("signupsFromIpSince counts agreements for that ip hash", async () => {
    const q = query({ count: 2 });
    from = fromQueue({ account_agreements: [q] });
    const { signupsFromIpSince } = await import("@/lib/account/data");
    expect(await signupsFromIpSince("h1", "2026-10-03T00:00:00Z")).toBe(2);
    expect(callArgs(q, "eq")).toEqual(["ip_hash", "h1"]);
    expect(callArgs(q, "gte")).toEqual(["agreed_at", "2026-10-03T00:00:00Z"]);
  });

  it("underLookupLimit refuses at 10 in 10 minutes and records a lookup otherwise", async () => {
    from = fromQueue({ gate_lookups: [query({ count: 10 })] });
    const { underLookupLimit } = await import("@/lib/account/data");
    expect(await underLookupLimit("h1")).toBe(false);

    const insert = query({});
    from = fromQueue({ gate_lookups: [query({ count: 3 }), query({ count: 12 }), insert] });
    expect(await underLookupLimit("h1")).toBe(true);
    expect(callArgs(insert, "insert")?.[0]).toEqual({ ip_hash: "h1" });
  });

  it("underLookupLimit refuses at 30 in a day", async () => {
    from = fromQueue({ gate_lookups: [query({ count: 2 }), query({ count: 30 })] });
    const { underLookupLimit } = await import("@/lib/account/data");
    expect(await underLookupLimit("h1")).toBe(false);
  });
});
