import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));

const row = { wholesale_open: true, wholesale_tiers: [{ minKits: 1, pct: 25 }, { minKits: 5, pct: 30 }, { minKits: 10, pct: 35 }],
  wholesale_deposit_pct: 40, wholesale_balance_days: 7, wholesale_run_days: 14, wholesale_lead_days: 28, wholesale_next_cutoff: null };

describe("wholesale data", () => {
  beforeEach(() => { vi.resetModules(); });

  it("reads and parses the settings; a read error throws", async () => {
    from = fromQueue({ shop_settings: [query({ data: row })] });
    const { getWholesaleSettings } = await import("@/lib/wholesale/data");
    expect((await getWholesaleSettings()).depositPct).toBe(40);
    from = fromQueue({ shop_settings: [query({ error: { message: "down" } })] });
    await expect(getWholesaleSettings()).rejects.toThrow(/settings/);
  });

  it("records the agreement then turns wholesale on, only when not switched off by the owner", async () => {
    const ins = query({}), upd = query({ data: [{ id: "c1" }] });
    from = fromQueue({ wholesale_agreements: [ins], customers: [upd] });
    const { enableWholesale } = await import("@/lib/wholesale/data");
    expect(await enableWholesale("c1", { ipHash: "h", userAgent: "ua" })).toBe("enabled");
    expect(callArgs(ins, "insert")?.[0]).toMatchObject({ customer_id: "c1", terms_version: "2026-10-08", ip_hash: "h", user_agent: "ua" });
    expect(upd.calls.filter(([m]) => m === "is").map(([, a]) => a[0])).toEqual(["wholesale_enabled_at", "wholesale_disabled_at"]);
  });

  it("re-accepting keeps the first date", async () => {
    const upd = query({ data: [] }), read = query({ data: { wholesale_enabled_at: "2026-10-01T00:00:00Z", wholesale_disabled_at: null } });
    from = fromQueue({ wholesale_agreements: [query({})], customers: [upd, read] });
    const { enableWholesale } = await import("@/lib/wholesale/data");
    expect(await enableWholesale("c1", { ipHash: "h", userAgent: "ua" })).toBe("enabled");
    expect(from.mock.calls.filter(([t]) => t === "customers")).toHaveLength(2); // update, then read — no second update
  });

  it("says disabled when the owner switched it off", async () => {
    const upd = query({ data: [] }), read = query({ data: { wholesale_enabled_at: "2026-10-01T00:00:00Z", wholesale_disabled_at: "2026-10-05T00:00:00Z" } });
    from = fromQueue({ wholesale_agreements: [query({})], customers: [upd, read] });
    const { enableWholesale } = await import("@/lib/wholesale/data");
    expect(await enableWholesale("c1", { ipHash: "h", userAgent: null })).toBe("disabled");
  });
});
