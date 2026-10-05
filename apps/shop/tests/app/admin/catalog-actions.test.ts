import { describe, it, expect, vi, beforeEach } from "vitest";

const requireOwner = vi.fn(async () => ({ id: "owner", fullName: "Kearney Adams" }));
const data = {
  receiveLot: vi.fn(), updateDraftLot: vi.fn(), putLotLive: vi.fn(), correctCount: vi.fn(), retireLot: vi.fn(),
  replaceCertificate: vi.fn(), setVariantField: vi.fn(), setShown: vi.fn(), createCoaUpload: vi.fn(), coaUploaded: vi.fn(), lotById: vi.fn(),
};
const catalogChangedByOwner = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/catalog-ops/data", () => data);
vi.mock("@/lib/catalog-live", () => ({ catalogChangedByOwner }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const receive = { slug: "bpc-157", variantId: "10mg", lotNumber: "BPC-2610-03", purity: "99.4", method: "HPLC+MS", testedOn: "2026-10-02", ordered: "200", counted: "196", damaged: "2", note: "Short 4; 2 cracked.", coaPath: "BPC-2610-03/1.pdf" };

describe("catalog actions", () => {
  beforeEach(() => { vi.resetModules(); Object.values(data).forEach((f) => f.mockReset()); catalogChangedByOwner.mockReset(); alertOwner.mockReset(); });

  it("receive: saves a draft, alerts on a discrepancy, refreshes", async () => {
    data.coaUploaded.mockResolvedValue(true);
    data.receiveLot.mockResolvedValue({ ok: true, id: "l9" });
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    const r = await receiveLotAction(null, fd({ ...receive, intent: "draft" }));
    expect(r).toEqual({ ok: "Saved BPC-2610-03 as a draft." });
    expect(alertOwner).toHaveBeenCalledWith("Lot BPC-2610-03 arrived short or damaged", expect.stringContaining("ordered 200, counted 196, damaged 2"));
    expect(catalogChangedByOwner).toHaveBeenCalled();
  });

  it("receive + put live goes live in the same step", async () => {
    data.coaUploaded.mockResolvedValue(true);
    data.receiveLot.mockResolvedValue({ ok: true, id: "l9" });
    data.putLotLive.mockResolvedValue("ok");
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    expect(await receiveLotAction(null, fd({ ...receive, counted: "200", damaged: "0", note: "", intent: "live" }))).toEqual({ ok: "BPC-2610-03 is live." });
    expect(data.putLotLive).toHaveBeenCalledWith("l9", "owner");
  });

  it("receive refuses a certificate path that wasn't uploaded, and a taken lot number", async () => {
    data.coaUploaded.mockResolvedValue(false);
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    expect(await receiveLotAction(null, fd({ ...receive, intent: "draft" }))).toEqual({ fieldErrors: { coa: "The certificate didn't finish uploading — attach it again." } });
    data.coaUploaded.mockResolvedValue(true);
    data.receiveLot.mockResolvedValue({ ok: false, taken: true });
    expect(await receiveLotAction(null, fd({ ...receive, intent: "draft" }))).toEqual({ fieldErrors: { lotNumber: "That lot number is already used." } });
  });

  it("put live on a lot that's no longer a draft throws (stale)", async () => {
    data.putLotLive.mockResolvedValue("not_draft");
    const { putLiveAction } = await import("@/app/admin/catalog/actions");
    await expect(putLiveAction(fd({ lotId: "11111111-1111-4111-8111-111111111111" }))).rejects.toThrow(/reload/);
  });

  it("correct count: below what's held + sold is a field error", async () => {
    data.correctCount.mockResolvedValue("below_committed");
    const { correctCountAction } = await import("@/app/admin/catalog/actions");
    expect(await correctCountAction(null, fd({ lotId: "11111111-1111-4111-8111-111111111111", direction: "remove", vials: "50", reason: "damaged", note: "" })))
      .toEqual({ fieldErrors: { vials: "That's more than are left — held and sold vials can't be removed." } });
  });

  it("price: parses dollars and logs through setVariantField", async () => {
    data.setVariantField.mockResolvedValue({ ok: true });
    const { setFieldAction } = await import("@/app/admin/catalog/actions");
    expect(await setFieldAction(null, fd({ slug: "ss-31", variantId: "50mg", field: "price", value: "$109" }))).toEqual({ ok: "Saved." });
    expect(data.setVariantField).toHaveBeenCalledWith("ss-31", "50mg", "price_cents", 10900, "owner");
  });

  it("SKU taken is a field error", async () => {
    data.setVariantField.mockResolvedValue({ ok: false, reason: "taken" });
    const { setFieldAction } = await import("@/app/admin/catalog/actions");
    expect(await setFieldAction(null, fd({ slug: "ss-31", variantId: "50mg", field: "sku", value: "AP-SS31-10" }))).toEqual({ error: "Another strength already uses that SKU." });
  });

  it("every action checks the owner first", async () => {
    requireOwner.mockRejectedValueOnce(new Error("NOT_FOUND"));
    const { setShownAction } = await import("@/app/admin/catalog/actions");
    await expect(setShownAction(fd({ slug: "bpc-157", shown: "false" }))).rejects.toThrow("NOT_FOUND");
    expect(data.setShown).not.toHaveBeenCalled();
  });
});
