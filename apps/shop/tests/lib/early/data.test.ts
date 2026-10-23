import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
const ensureReferralCode = vi.fn();
vi.mock("@/lib/waitlist/data", () => ({ ensureReferralCode: (e: string) => ensureReferralCode(e) }));
const getLiveCatalogOrNull = vi.fn();
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: () => getLiveCatalogOrNull() }));

describe("early access data", () => {
  beforeEach(() => { vi.resetModules(); ensureReferralCode.mockReset(); getLiveCatalogOrNull.mockReset(); });

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

  it("ensureEarlyBatch reuses the EARLY- batch or makes it", async () => {
    from = fromQueue({ discount_batches: [query({ data: { id: "b1" } }), query({ data: null }), query({ data: { id: "b2" } })] });
    const { ensureEarlyBatch } = await import("@/lib/early/data");
    expect(await ensureEarlyBatch("o1")).toBe("b1");
    expect(await ensureEarlyBatch("o1")).toBe("b2");
  });

  it("syncEarlyBatchSize sets the batch size to its code count (at least 1)", async () => {
    const up = query({});
    from = fromQueue({ discount_codes: [query({ count: 7 })], discount_batches: [up] });
    const { syncEarlyBatchSize } = await import("@/lib/early/data");
    expect(await syncEarlyBatchSize("b1")).toBe(7);
    expect(callArgs(up, "update")).toEqual([{ size: 7 }]);
  });

  it("ensureEarlyCode upserts EARLY-<invite code> without touching an existing one", async () => {
    ensureReferralCode.mockResolvedValue("K7QM2P");
    const q = query({});
    from = fromQueue({ discount_codes: [q] });
    const { ensureEarlyCode } = await import("@/lib/early/data");
    expect(await ensureEarlyCode("a@b.co", "2026-12-01", "b1", null)).toEqual({ ref: "K7QM2P", code: "EARLY-K7QM2P" });
    const [row, opts] = callArgs(q, "upsert") as [Record<string, unknown>, unknown];
    expect(row).toMatchObject({ code: "EARLY-K7QM2P", batch_id: "b1", max_uses: 1, kind: "item_pct", locked_email: null });
    expect(opts).toEqual({ onConflict: "code", ignoreDuplicates: true });
  });

  it("ensureEarlyCode throws on a write error", async () => {
    ensureReferralCode.mockResolvedValue("K7QM2P");
    from = fromQueue({ discount_codes: [query({ error: { message: "nope" } })] });
    const { ensureEarlyCode } = await import("@/lib/early/data");
    await expect(ensureEarlyCode("a@b.co", "2026-12-01", "b1", null)).rejects.toThrow(/EARLY-K7QM2P.*nope/);
  });

  it("earlyPriceCents is GLOW 70 mg's live price, and throws without one", async () => {
    getLiveCatalogOrNull.mockResolvedValueOnce({ all: [{ slug: "bpc-157-tb-500-ghk-cu", variants: [{ strength: "50 mg", priceUsd: 120 }, { strength: "70 mg", priceUsd: 175 }] }] })
      .mockResolvedValueOnce(null);
    const { earlyPriceCents } = await import("@/lib/early/data");
    expect(await earlyPriceCents()).toBe(17500);
    await expect(earlyPriceCents()).rejects.toThrow(/no live price/);
  });
});
