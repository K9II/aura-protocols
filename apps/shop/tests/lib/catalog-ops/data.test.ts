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
});
