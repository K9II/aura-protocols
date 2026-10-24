import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
const getLiveCatalogOrNull = vi.fn();
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: () => getLiveCatalogOrNull() }));

describe("early access data", () => {
  beforeEach(() => { vi.resetModules(); getLiveCatalogOrNull.mockReset(); });

  it("reads the switch once a minute and throws when it can't", async () => {
    from = fromQueue({ shop_settings: [query({ data: { early_access_open: true } }), query({ error: { message: "down" } })] });
    const { earlyAccessOpen } = await import("@/lib/early/data");
    expect(await earlyAccessOpen(1_000)).toBe(true);
    expect(await earlyAccessOpen(30_000)).toBe(true); // cached: no second read
    await expect(earlyAccessOpen(70_000)).rejects.toThrow(/down/);
  });

  it("setEarlyAccessOpen only moves from the other position", async () => {
    const moved = query({ data: [{ id: true }] }), stale = query({ data: [] });
    from = fromQueue({ shop_settings: [moved, stale] });
    const { setEarlyAccessOpen } = await import("@/lib/early/data");
    expect(await setEarlyAccessOpen(true)).toBe(true);
    expect(moved.calls.filter(([m]) => m === "eq").map(([, a]) => a)).toEqual([["id", true], ["early_access_open", false]]);
    expect(await setEarlyAccessOpen(true)).toBe(false);
  });

  it("earlyPriceCents is GLOW 70 mg's live price, and throws without one", async () => {
    getLiveCatalogOrNull.mockResolvedValueOnce({ all: [{ slug: "bpc-157-tb-500-ghk-cu", variants: [{ strength: "50 mg", priceUsd: 120 }, { strength: "70 mg", priceUsd: 175 }] }] })
      .mockResolvedValueOnce(null);
    const { earlyPriceCents } = await import("@/lib/early/data");
    expect(await earlyPriceCents()).toBe(17500);
    await expect(earlyPriceCents()).rejects.toThrow(/no live price/);
  });
});
