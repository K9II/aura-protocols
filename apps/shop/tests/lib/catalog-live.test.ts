import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchCatalogOps = vi.fn(), alertOwner = vi.fn(), revalidateTag = vi.fn(), updateTag = vi.fn();
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag, updateTag }));
vi.mock("@/lib/catalog-ops/data", () => ({ fetchCatalogOps }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ publicSupabaseEnv: () => ({ url: "https://p.supabase.co", anonKey: "k" }) }));

describe("catalog-live", () => {
  beforeEach(() => { vi.resetModules(); fetchCatalogOps.mockReset(); alertOwner.mockReset(); revalidateTag.mockReset(); updateTag.mockReset(); });

  it("certificate URLs point at the public coa bucket", async () => {
    const { coaPublicUrl } = await import("@/lib/catalog-live");
    expect(coaPublicUrl("BPC-1/5.pdf")).toBe("https://p.supabase.co/storage/v1/object/public/coa/BPC-1/5.pdf");
  });

  it("getLiveCatalogOrNull returns null and alerts the owner once when the DB can't be read", async () => {
    fetchCatalogOps.mockRejectedValue(new Error("down"));
    const { getLiveCatalogOrNull } = await import("@/lib/catalog-live");
    expect(await getLiveCatalogOrNull()).toBeNull();
    expect(await getLiveCatalogOrNull()).toBeNull();
    expect(alertOwner).toHaveBeenCalledTimes(1);
  });

  it("owner changes update the tag; stock changes expire it now", async () => {
    const { catalogChangedByOwner, catalogStockChanged, CATALOG_TAG } = await import("@/lib/catalog-live");
    catalogChangedByOwner();
    catalogStockChanged();
    expect(updateTag).toHaveBeenCalledWith(CATALOG_TAG);
    expect(revalidateTag).toHaveBeenCalledWith(CATALOG_TAG, { expire: 0 });
  });

  it("a failed stock refresh never breaks the caller", async () => {
    revalidateTag.mockImplementation(() => { throw new Error("outside a request"); });
    const { catalogStockChanged } = await import("@/lib/catalog-live");
    expect(() => catalogStockChanged()).not.toThrow();
  });
});
