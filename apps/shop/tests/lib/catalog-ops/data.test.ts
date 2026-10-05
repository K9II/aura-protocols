import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

const rpc = vi.fn(), createSignedUploadUrl = vi.fn(), list = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({
  from: (t: string) => from(t), rpc, storage: { from: () => ({ createSignedUploadUrl, list }) },
}) }));

describe("catalog-ops data", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); createSignedUploadUrl.mockReset(); list.mockReset(); });

  it("fetchCatalogOps reads products, variants and live/retired lots only", async () => {
    const lots = query({ data: [{ id: "l1", purity_pct: "99.40", sellable: 10, held: 0, sold: 0, available: 10 }] });
    from = fromQueue({ catalog_products: [query({ data: [{ slug: "bpc-157", shown: true }] })], catalog_variants: [query({ data: [] })], lot_stock: [lots] });
    const { fetchCatalogOps } = await import("@/lib/catalog-ops/data");
    const ops = await fetchCatalogOps();
    expect(callArgs(lots, "in")).toEqual(["status", ["live", "retired"]]);
    expect(ops.lots[0].purity_pct).toBe(99.4);
  });

  it("fetchCatalogOps throws on any read error (the storefront then fails closed)", async () => {
    from = fromQueue({ catalog_products: [query({ error: { message: "down" } })], catalog_variants: [query({ data: [] })], lot_stock: [query({ data: [] })] });
    const { fetchCatalogOps } = await import("@/lib/catalog-ops/data");
    await expect(fetchCatalogOps()).rejects.toThrow(/catalog read failed/);
  });

  it("orderItemLots reads more than 100 ids in chunks and merges the results", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `i${i}`);
    const holds = [
      query({ data: [{ order_item_id: "i0", qty: 2, state: "held", lots: { lot_number: "A1" } }] }),
      query({ data: [{ order_item_id: "i150", qty: 1, state: "sold", lots: { lot_number: "B2" } }] }),
      query({ data: [{ order_item_id: "i249", qty: 3, state: "held", lots: { lot_number: "C3" } }] }),
    ];
    const shipped = [query({ data: [] }), query({ data: [{ order_item_id: "i150", lot_number: "B2", qty: 1 }] }), query({ data: [] })];
    from = fromQueue({ lot_holds: [...holds], shipped_lots: [...shipped] });
    const { orderItemLots } = await import("@/lib/catalog-ops/data");
    const out = await orderItemLots(ids);
    expect(from).toHaveBeenCalledTimes(6);
    expect(holds.map((q) => (callArgs(q, "in")![1] as string[]).length)).toEqual([100, 100, 50]);
    expect(shipped.map((q) => (callArgs(q, "in")![1] as string[]).length)).toEqual([100, 100, 50]);
    expect((callArgs(holds[2], "in")![1] as string[])[0]).toBe("i200");
    expect(out.size).toBe(250);
    expect(out.get("i0")).toEqual({ allocated: [{ lotNumber: "A1", qty: 2 }], shipped: [] });
    expect(out.get("i150")).toEqual({ allocated: [{ lotNumber: "B2", qty: 1 }], shipped: [{ lotNumber: "B2", qty: 1 }] });
    expect(out.get("i249")!.allocated).toEqual([{ lotNumber: "C3", qty: 3 }]);
  });

  it("orderItemLots throws when any chunk fails", async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `i${i}`);
    from = fromQueue({ lot_holds: [query({ data: [] }), query({ error: { message: "down" } })], shipped_lots: [query({ data: [] }), query({ data: [] })] });
    const { orderItemLots } = await import("@/lib/catalog-ops/data");
    await expect(orderItemLots(ids)).rejects.toThrow();
  });

  it("orderItemLots makes no reads for no ids", async () => {
    from = fromQueue({});
    const { orderItemLots } = await import("@/lib/catalog-ops/data");
    expect((await orderItemLots([])).size).toBe(0);
    expect(from).not.toHaveBeenCalled();
  });

  it("holdVials maps the function's answer", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: false, reason: "sold_out", short: ["mots-c:10mg"] }, error: null });
    const { holdVials } = await import("@/lib/catalog-ops/data");
    expect(await holdVials("o1")).toEqual({ ok: false, reason: "sold_out", short: [{ slug: "mots-c", variantId: "10mg" }] });
    expect(rpc).toHaveBeenCalledWith("hold_vials", { p_order: "o1" });
  });

  it("holdVials throws on an RPC error", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const { holdVials } = await import("@/lib/catalog-ops/data");
    await expect(holdVials("o1")).rejects.toThrow(/hold_vials failed/);
  });

  it("receiveLot inserts the lot and a lot_received event; a taken lot number is reported, not thrown", async () => {
    const ins = query({ data: { id: "l9" } });
    const ev = query({});
    from = fromQueue({ lots: [ins, query({ error: { code: "23505", message: "dup" } })], catalog_events: [ev] });
    const { receiveLot } = await import("@/lib/catalog-ops/data");
    const v = { lotNumber: "BPC-2610-03", purityPct: 99.4, method: "HPLC+MS" as const, testedOn: "2026-10-02", orderedQty: 200, countedQty: 196, damagedQty: 2, discrepancyNote: "short", coaPath: null };
    expect(await receiveLot("bpc-157", "10mg", v, "owner")).toEqual({ ok: true, id: "l9" });
    expect(callArgs(ins, "insert")?.[0]).toMatchObject({ lot_number: "BPC-2610-03", slug: "bpc-157", variant_id: "10mg", counted_qty: 196, received_by: "owner", status: "draft" });
    expect(callArgs(ev, "insert")?.[0]).toMatchObject({ kind: "lot_received", lot_id: "l9", actor_id: "owner" });
    expect(await receiveLot("bpc-157", "10mg", v, "owner")).toEqual({ ok: false, taken: true });
  });

  it("correctCount passes the signed delta and source", async () => {
    rpc.mockResolvedValueOnce({ data: "below_committed", error: null });
    const { correctCount } = await import("@/lib/catalog-ops/data");
    expect(await correctCount("l1", -3, "damaged", null, "owner")).toBe("below_committed");
    expect(rpc).toHaveBeenCalledWith("admin_correct_count", { p_lot: "l1", p_delta: -3, p_reason: "damaged", p_note: null, p_actor: "owner", p_source: "manual" });
  });

  it("setVariantField logs before → after", async () => {
    const read = query({ data: { price_cents: 11900 } });
    const upd = query({ data: [{ slug: "ss-31" }] });
    const ev = query({});
    from = fromQueue({ catalog_variants: [read, upd], catalog_events: [ev] });
    const { setVariantField } = await import("@/lib/catalog-ops/data");
    expect(await setVariantField("ss-31", "50mg", "price_cents", 10900, "owner")).toEqual({ ok: true });
    expect(callArgs(ev, "insert")?.[0]).toMatchObject({ kind: "price_changed", before: { price_cents: 11900 }, after: { price_cents: 10900 } });
  });

  it("createCoaUpload signs an upload for a fresh path under the lot", async () => {
    createSignedUploadUrl.mockResolvedValueOnce({ data: { token: "t", path: "BPC-1/5.pdf" }, error: null });
    const { createCoaUpload } = await import("@/lib/catalog-ops/data");
    expect(await createCoaUpload("BPC-1", 5)).toEqual({ path: "BPC-1/5.pdf", token: "t" });
    expect(createSignedUploadUrl).toHaveBeenCalledWith("BPC-1/5.pdf");
  });

  it("coaUploaded checks the object exists", async () => {
    list.mockResolvedValueOnce({ data: [{ name: "5.pdf" }], error: null });
    const { coaUploaded } = await import("@/lib/catalog-ops/data");
    expect(await coaUploaded("BPC-1/5.pdf")).toBe(true);
    expect(list).toHaveBeenCalledWith("BPC-1", { search: "5.pdf" });
  });
  describe("strengths", () => {
    const add = { strength: "30 mg", variantId: "30mg", priceCents: 9900, lowAt: 10, sku: "AP-SS31-30" };

    it("fetchCatalogOps and fetchAdminOps read strength, shown and archived_at", async () => {
      const v1 = query({ data: [] }), v2 = query({ data: [] });
      from = fromQueue({ catalog_products: [query({ data: [] }), query({ data: [] })], catalog_variants: [v1, v2], lot_stock: [query({ data: [] }), query({ data: [] })] });
      const { fetchCatalogOps, fetchAdminOps } = await import("@/lib/catalog-ops/data");
      await fetchCatalogOps();
      await fetchAdminOps("ss-31");
      for (const q of [v1, v2]) expect(String(callArgs(q, "select")?.[0])).toMatch(/strength.*shown, archived_at/);
    });

    it("addVariant inserts it hidden and logs strength_added", async () => {
      const ins = query({}), ev = query({});
      from = fromQueue({ catalog_variants: [query({ data: null }), ins], catalog_events: [ev] });
      const { addVariant } = await import("@/lib/catalog-ops/data");
      expect(await addVariant("ss-31", add, "owner")).toEqual({ ok: true });
      expect(callArgs(ins, "insert")?.[0]).toEqual({ slug: "ss-31", variant_id: "30mg", strength: "30 mg", price_cents: 9900, low_at: 10, threepl_sku: "AP-SS31-30", shown: false });
      expect(callArgs(ev, "insert")?.[0]).toMatchObject({ kind: "strength_added", variant_id: "30mg", actor_id: "owner", after: { strength: "30 mg", price_cents: 9900, shown: false } });
    });

    it("addVariant reports an existing or archived key before inserting", async () => {
      from = fromQueue({ catalog_variants: [query({ data: { strength: "30 mg", shown: false, archived_at: null } }), query({ data: { strength: "30 mg", shown: false, archived_at: "2026-10-04T00:00:00Z" } })] });
      const { addVariant } = await import("@/lib/catalog-ops/data");
      expect(await addVariant("ss-31", add, "owner")).toEqual({ ok: false, reason: "taken" });
      expect(await addVariant("ss-31", add, "owner")).toEqual({ ok: false, reason: "archived" });
    });

    it("addVariant maps unique violations: the SKU, else the key (a race)", async () => {
      from = fromQueue({ catalog_variants: [
        query({ data: null }), query({ error: { code: "23505", message: 'duplicate key value violates unique constraint "catalog_variants_threepl_sku_key"' } }),
        query({ data: null }), query({ error: { code: "23505", message: 'duplicate key value violates unique constraint "catalog_variants_pkey"' } }),
      ] });
      const { addVariant } = await import("@/lib/catalog-ops/data");
      expect(await addVariant("ss-31", add, "owner")).toEqual({ ok: false, reason: "sku_taken" });
      expect(await addVariant("ss-31", add, "owner")).toEqual({ ok: false, reason: "taken" });
    });

    it("addVariant throws on any other error", async () => {
      from = fromQueue({ catalog_variants: [query({ data: null }), query({ error: { code: "23514", message: "check" } })] });
      const { addVariant } = await import("@/lib/catalog-ops/data");
      await expect(addVariant("ss-31", add, "owner")).rejects.toThrow(/strength insert failed/);
    });

    it("setVariantShown only flips a non-archived row in the other state and logs shown / hidden", async () => {
      const upd = query({ data: [{ strength: "30 mg" }] }), ev = query({});
      from = fromQueue({ catalog_variants: [upd], catalog_events: [ev] });
      const { setVariantShown } = await import("@/lib/catalog-ops/data");
      expect(await setVariantShown("ss-31", "30mg", true, "owner")).toEqual({ ok: true });
      expect(callArgs(upd, "update")?.[0]).toMatchObject({ shown: true });
      expect(callArgs(upd, "is")).toEqual(["archived_at", null]);
      expect(callArgs(upd, "neq")).toEqual(["shown", true]);
      expect(callArgs(ev, "insert")?.[0]).toMatchObject({ kind: "strength_shown", after: { strength: "30 mg" } });
    });

    it("setVariantShown is idempotent: already in that state → ok, no event; missing or archived → ok:false", async () => {
      from = fromQueue({ catalog_variants: [
        query({ data: [] }), query({ data: { strength: "30 mg", shown: true, archived_at: null } }),
        query({ data: [] }), query({ data: { strength: "50 mg", shown: false, archived_at: "2026-10-04T00:00:00Z" } }),
        query({ data: [] }), query({ data: null }),
      ] });
      const { setVariantShown } = await import("@/lib/catalog-ops/data");
      expect(await setVariantShown("ss-31", "30mg", true, "owner")).toEqual({ ok: true });
      expect(await setVariantShown("ss-31", "50mg", false, "owner")).toEqual({ ok: false });
      expect(await setVariantShown("ss-31", "99mg", true, "owner")).toEqual({ ok: false });
    });

    it("archiveVariant hides and archives a non-archived row; restoreVariant brings an archived one back hidden", async () => {
      const arch = query({ data: [{ strength: "50 mg" }] }), rest = query({ data: [{ strength: "50 mg" }] });
      const e1 = query({}), e2 = query({});
      from = fromQueue({ catalog_variants: [arch, rest], catalog_events: [e1, e2] });
      const { archiveVariant, restoreVariant } = await import("@/lib/catalog-ops/data");
      expect(await archiveVariant("ss-31", "50mg", "owner")).toEqual({ ok: true });
      expect(callArgs(arch, "update")?.[0]).toMatchObject({ shown: false, archived_at: expect.any(String) });
      expect(callArgs(arch, "is")).toEqual(["archived_at", null]);
      expect(callArgs(e1, "insert")?.[0]).toMatchObject({ kind: "strength_archived" });
      expect(await restoreVariant("ss-31", "50mg", "owner")).toEqual({ ok: true });
      expect(callArgs(rest, "update")?.[0]).toMatchObject({ shown: false, archived_at: null });
      expect(callArgs(rest, "not")).toEqual(["archived_at", "is", null]);
      expect(callArgs(e2, "insert")?.[0]).toMatchObject({ kind: "strength_restored" });
    });

    it("archive / restore throw on a database error", async () => {
      from = fromQueue({ catalog_variants: [query({ error: { message: "down" } })] });
      const { archiveVariant } = await import("@/lib/catalog-ops/data");
      await expect(archiveVariant("ss-31", "50mg", "owner")).rejects.toThrow(/strength archive failed/);
    });

    it("deleteVariant calls admin_delete_variant and refuses an unexpected answer", async () => {
      rpc.mockResolvedValueOnce({ data: "has_history", error: null }).mockResolvedValueOnce({ data: "weird", error: null });
      const { deleteVariant } = await import("@/lib/catalog-ops/data");
      expect(await deleteVariant("ss-31", "50mg", "owner")).toBe("has_history");
      expect(rpc).toHaveBeenCalledWith("admin_delete_variant", { p_slug: "ss-31", p_variant: "50mg", p_actor: "owner" });
      await expect(deleteVariant("ss-31", "50mg", "owner")).rejects.toThrow(/admin_delete_variant failed/);
    });

    it("variantHistory is one variant_history call (counted in SQL, no row cap)", async () => {
      rpc.mockResolvedValueOnce({ data: [{ variant_id: "50mg", lots: 2, orders: 47 }, { variant_id: "10mg", lots: 1, orders: 0 }], error: null });
      const { variantHistory } = await import("@/lib/catalog-ops/data");
      const h = await variantHistory("ss-31");
      expect(rpc).toHaveBeenCalledWith("variant_history", { p_slug: "ss-31" });
      expect(h.get("50mg")).toEqual({ lots: 2, orders: 47 });
      expect(h.get("10mg")).toEqual({ lots: 1, orders: 0 });
      expect(h.get("30mg")).toBeUndefined();
    });

    it("variantHistory throws on an RPC error", async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: "down" } });
      const { variantHistory } = await import("@/lib/catalog-ops/data");
      await expect(variantHistory("ss-31")).rejects.toThrow(/variant_history failed/);
    });
  });
});
