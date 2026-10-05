import { describe, it, expect, vi, beforeEach } from "vitest";

const requireOwner = vi.fn(async () => ({ id: "owner", fullName: "Kearney Adams" }));
const data = {
  receiveLot: vi.fn(), updateDraftLot: vi.fn(), putLotLive: vi.fn(), correctCount: vi.fn(), retireLot: vi.fn(),
  replaceCertificate: vi.fn(), setVariantField: vi.fn(), setShown: vi.fn(), createCoaUpload: vi.fn(), coaUploaded: vi.fn(), lotById: vi.fn(),
  variantRow: vi.fn(), addVariant: vi.fn(), setVariantShown: vi.fn(), archiveVariant: vi.fn(), restoreVariant: vi.fn(), deleteVariant: vi.fn(),
};
const catalogChangedByOwner = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/catalog-ops/data", () => data);
vi.mock("@/lib/catalog-live", () => ({ catalogChangedByOwner }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const VALID_UUID = "11111111-1111-4111-8111-111111111111";
const receive = { slug: "bpc-157", variantId: "10mg", lotNumber: "BPC-2610-03", purity: "99.4", method: "HPLC+MS", testedOn: "2026-10-02", ordered: "200", counted: "196", damaged: "2", note: "Short 4; 2 cracked.", coaPath: "BPC-2610-03/1700000000000.pdf" };

describe("catalog actions", () => {
  beforeEach(() => {
    vi.resetModules(); Object.values(data).forEach((f) => f.mockReset()); catalogChangedByOwner.mockReset(); alertOwner.mockReset();
    data.variantRow.mockResolvedValue({ strength: "10 mg", shown: true, archived_at: null });
  });

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

  it.each([
    ["a path under another lot", "OTHER-LOT/1700000000000.pdf"],
    ["a path traversal attempt", "BPC-2610-03/../1700000000000.pdf"],
  ])("receive refuses %s without ever checking storage or inserting", async (_label, coaPath) => {
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    expect(await receiveLotAction(null, fd({ ...receive, coaPath, intent: "draft" })))
      .toEqual({ fieldErrors: { coa: "The certificate didn't finish uploading — attach it again." } });
    expect(data.coaUploaded).not.toHaveBeenCalled();
    expect(data.receiveLot).not.toHaveBeenCalled();
  });

  it("a taken lot number does not refresh the live catalog", async () => {
    data.coaUploaded.mockResolvedValue(true);
    data.receiveLot.mockResolvedValue({ ok: false, taken: true });
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    await receiveLotAction(null, fd({ ...receive, intent: "draft" }));
    expect(catalogChangedByOwner).not.toHaveBeenCalled();
  });

  it("receive + live with no certificate stays a draft and says why", async () => {
    data.coaUploaded.mockResolvedValue(true);
    data.receiveLot.mockResolvedValue({ ok: true, id: "l9" });
    data.putLotLive.mockResolvedValue("no_certificate");
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    expect(await receiveLotAction(null, fd({ ...receive, counted: "200", damaged: "0", note: "", intent: "live" })))
      .toEqual({ error: "Saved as a draft. Attach the certificate first." });
  });

  describe("editing a draft", () => {
    it("fires the same discrepancy alert as a new receive", async () => {
      data.coaUploaded.mockResolvedValue(true);
      data.updateDraftLot.mockResolvedValue({ ok: true });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      await receiveLotAction(null, fd({ ...receive, lotId: VALID_UUID, intent: "draft" }));
      expect(alertOwner).toHaveBeenCalledWith("Lot BPC-2610-03 arrived short or damaged", expect.stringContaining("ordered 200, counted 196, damaged 2"));
    });

    it("a taken lot number is a field error", async () => {
      data.coaUploaded.mockResolvedValue(true);
      data.updateDraftLot.mockResolvedValue({ ok: false, taken: true });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      expect(await receiveLotAction(null, fd({ ...receive, lotId: VALID_UUID, intent: "draft" })))
        .toEqual({ fieldErrors: { lotNumber: "That lot number is already used." } });
    });

    it("a lot that's no longer a draft throws (stale)", async () => {
      data.coaUploaded.mockResolvedValue(true);
      data.updateDraftLot.mockResolvedValue({ ok: false });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      await expect(receiveLotAction(null, fd({ ...receive, lotId: VALID_UUID, intent: "draft" }))).rejects.toThrow(/reload/);
    });
  });

  it("put live on a lot that's no longer a draft throws (stale)", async () => {
    data.putLotLive.mockResolvedValue("not_draft");
    const { putLiveAction } = await import("@/app/admin/catalog/actions");
    await expect(putLiveAction(fd({ lotId: VALID_UUID }))).rejects.toThrow(/reload/);
  });

  it("a malformed lotId throws before touching the database", async () => {
    const { putLiveAction } = await import("@/app/admin/catalog/actions");
    await expect(putLiveAction(fd({ lotId: "not-a-uuid" }))).rejects.toThrow(/reload/);
    expect(data.putLotLive).not.toHaveBeenCalled();
  });

  it("correct count: below what's held + sold is a field error and does not refresh", async () => {
    data.correctCount.mockResolvedValue("below_committed");
    const { correctCountAction } = await import("@/app/admin/catalog/actions");
    expect(await correctCountAction(null, fd({ lotId: VALID_UUID, direction: "remove", vials: "50", reason: "damaged", note: "" })))
      .toEqual({ fieldErrors: { vials: "That's more than are left — held and sold vials can't be removed." } });
    expect(catalogChangedByOwner).not.toHaveBeenCalled();
  });

  describe("replaceCertificateAction", () => {
    it("refuses a path under another lot without checking storage", async () => {
      data.lotById.mockResolvedValue({ lot_number: "BPC-2610-03", slug: "bpc-157" });
      const { replaceCertificateAction } = await import("@/app/admin/catalog/actions");
      expect(await replaceCertificateAction(null, fd({ lotId: VALID_UUID, coaPath: "OTHER-LOT/1700000000000.pdf" })))
        .toEqual({ fieldErrors: { coa: "The certificate didn't finish uploading — attach it again." } });
      expect(data.coaUploaded).not.toHaveBeenCalled();
      expect(data.replaceCertificate).not.toHaveBeenCalled();
    });

    it("refuses when the object is missing from storage", async () => {
      data.lotById.mockResolvedValue({ lot_number: "BPC-2610-03", slug: "bpc-157" });
      data.coaUploaded.mockResolvedValue(false);
      const { replaceCertificateAction } = await import("@/app/admin/catalog/actions");
      expect(await replaceCertificateAction(null, fd({ lotId: VALID_UUID, coaPath: "BPC-2610-03/1700000000000.pdf" })))
        .toEqual({ fieldErrors: { coa: "The certificate didn't finish uploading — attach it again." } });
    });

    it("on success, validates against the DB's own lot number and refreshes", async () => {
      data.lotById.mockResolvedValue({ lot_number: "BPC-2610-03", slug: "bpc-157" });
      data.coaUploaded.mockResolvedValue(true);
      data.replaceCertificate.mockResolvedValue(true);
      const { replaceCertificateAction } = await import("@/app/admin/catalog/actions");
      expect(await replaceCertificateAction(null, fd({ lotId: VALID_UUID, coaPath: "BPC-2610-03/1700000000000.pdf" })))
        .toEqual({ ok: "Certificate replaced. The old file stays in the log." });
      expect(catalogChangedByOwner).toHaveBeenCalled();
    });

    it("throws when the lot no longer exists", async () => {
      data.lotById.mockResolvedValue(null);
      const { replaceCertificateAction } = await import("@/app/admin/catalog/actions");
      await expect(replaceCertificateAction(null, fd({ lotId: VALID_UUID, coaPath: "X/1700000000000.pdf" }))).rejects.toThrow(/reload/);
    });
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

  it("an unknown slug throws before any write", async () => {
    const { setFieldAction } = await import("@/app/admin/catalog/actions");
    await expect(setFieldAction(null, fd({ slug: "no-such-slug", variantId: "50mg", field: "price", value: "$1" }))).rejects.toThrow(/reload the page/);
    expect(data.setVariantField).not.toHaveBeenCalled();
  });

  it("an unknown strength throws before any write", async () => {
    data.variantRow.mockResolvedValue(null);
    const { setFieldAction } = await import("@/app/admin/catalog/actions");
    await expect(setFieldAction(null, fd({ slug: "ss-31", variantId: "999mg", field: "price", value: "$1" }))).rejects.toThrow(/reload the page/);
    expect(data.setVariantField).not.toHaveBeenCalled();
  });

  it("a prototype-chain field name is rejected, not silently accepted", async () => {
    const { setFieldAction } = await import("@/app/admin/catalog/actions");
    await expect(setFieldAction(null, fd({ slug: "ss-31", variantId: "50mg", field: "toString", value: "x" }))).rejects.toThrow("Unknown field.");
    expect(data.setVariantField).not.toHaveBeenCalled();
  });

  describe("coaUploadAction", () => {
    it("rejects a bad lot number without creating an upload link", async () => {
      const { coaUploadAction } = await import("@/app/admin/catalog/actions");
      expect(await coaUploadAction("../x")).toEqual({ error: "Enter the lot number first." });
      expect(await coaUploadAction("ab")).toEqual({ error: "Enter the lot number first." });
      expect(data.createCoaUpload).not.toHaveBeenCalled();
    });

    it("upper-cases a lower-case lot number", async () => {
      data.createCoaUpload.mockResolvedValue({ path: "BPC-2610-03/1700000000000.pdf", token: "tok" });
      const { coaUploadAction } = await import("@/app/admin/catalog/actions");
      expect(await coaUploadAction("bpc-2610-03")).toEqual({ path: "BPC-2610-03/1700000000000.pdf", token: "tok" });
      expect(data.createCoaUpload).toHaveBeenCalledWith("BPC-2610-03");
    });
  });

  describe("strengths in the database", () => {
    it("receive into a hidden strength works; into an archived one throws (stale)", async () => {
      data.coaUploaded.mockResolvedValue(true);
      data.receiveLot.mockResolvedValue({ ok: true, id: "l9" });
      data.variantRow.mockResolvedValue({ strength: "30 mg", shown: false, archived_at: null });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      expect(await receiveLotAction(null, fd({ ...receive, slug: "ss-31", variantId: "30mg", intent: "draft" }))).toEqual({ ok: "Saved BPC-2610-03 as a draft." });
      expect(alertOwner).toHaveBeenCalledWith(expect.any(String), expect.stringContaining("SS-31 (Elamipretide) 30 mg"));
      data.variantRow.mockResolvedValue({ strength: "50 mg", shown: false, archived_at: "2026-10-04T00:00:00Z" });
      data.receiveLot.mockClear();
      await expect(receiveLotAction(null, fd({ ...receive, slug: "ss-31", variantId: "50mg", intent: "draft" }))).rejects.toThrow(/reload/);
      expect(data.receiveLot).not.toHaveBeenCalled();
    });

    const addForm = { slug: "ss-31", amount: "30", unit: "mg", price: "$99", lowAt: "10", sku: "ap-ss31-30" };

    it("add: parses, inserts hidden, refreshes", async () => {
      data.addVariant.mockResolvedValue({ ok: true });
      const { addStrengthAction } = await import("@/app/admin/catalog/actions");
      expect(await addStrengthAction(null, fd(addForm))).toEqual({ ok: "Added 30 mg — hidden until you show it." });
      expect(data.addVariant).toHaveBeenCalledWith("ss-31", { strength: "30 mg", variantId: "30mg", priceCents: 9900, lowAt: 10, sku: "AP-SS31-30" }, "owner");
      expect(catalogChangedByOwner).toHaveBeenCalled();
    });

    it("add: field errors for bad amount, unit, price, low level and SKU, without writing", async () => {
      const { addStrengthAction } = await import("@/app/admin/catalog/actions");
      const r = await addStrengthAction(null, fd({ slug: "ss-31", amount: "0", unit: "mg", price: "0", lowAt: "-1", sku: "bad sku!" }));
      expect(Object.keys(r?.fieldErrors ?? {}).sort()).toEqual(["lowAt", "price", "sku", "strength"]);
      expect((await addStrengthAction(null, fd({ ...addForm, unit: "g" })))?.fieldErrors).toEqual({ strength: "Pick mg, mcg or IU." });
      expect(data.addVariant).not.toHaveBeenCalled();
      expect(catalogChangedByOwner).not.toHaveBeenCalled();
    });

    it.each([
      ["taken", { strength: "That strength already exists." }],
      ["archived", { strength: "That strength is archived — restore it instead." }],
      ["sku_taken", { sku: "That SKU is already used." }],
    ] as const)("add: %s is a field error and does not refresh", async (reason, fieldErrors) => {
      data.addVariant.mockResolvedValue({ ok: false, reason });
      const { addStrengthAction } = await import("@/app/admin/catalog/actions");
      expect(await addStrengthAction(null, fd(addForm))).toEqual({ fieldErrors });
      expect(catalogChangedByOwner).not.toHaveBeenCalled();
    });

    it("add: an unknown product throws before any write", async () => {
      const { addStrengthAction } = await import("@/app/admin/catalog/actions");
      await expect(addStrengthAction(null, fd({ ...addForm, slug: "no-such-slug" }))).rejects.toThrow(/reload the page/);
      expect(data.addVariant).not.toHaveBeenCalled();
    });

    it("show / hide: passes the state; stale throws", async () => {
      data.setVariantShown.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false });
      const { setStrengthShownAction } = await import("@/app/admin/catalog/actions");
      await setStrengthShownAction(fd({ slug: "ss-31", variantId: "30mg", shown: "true" }));
      expect(data.setVariantShown).toHaveBeenCalledWith("ss-31", "30mg", true, "owner");
      expect(catalogChangedByOwner).toHaveBeenCalledTimes(1);
      await expect(setStrengthShownAction(fd({ slug: "ss-31", variantId: "30mg", shown: "false" }))).rejects.toThrow(/reload/);
      expect(catalogChangedByOwner).toHaveBeenCalledTimes(1);
    });

    it("archive and restore; stale throws", async () => {
      data.archiveVariant.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false });
      data.restoreVariant.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false });
      const { archiveStrengthAction, restoreStrengthAction } = await import("@/app/admin/catalog/actions");
      await archiveStrengthAction(fd({ slug: "ss-31", variantId: "50mg" }));
      expect(data.archiveVariant).toHaveBeenCalledWith("ss-31", "50mg", "owner");
      await expect(archiveStrengthAction(fd({ slug: "ss-31", variantId: "50mg" }))).rejects.toThrow(/reload/);
      await restoreStrengthAction(fd({ slug: "ss-31", variantId: "50mg" }));
      expect(data.restoreVariant).toHaveBeenCalledWith("ss-31", "50mg", "owner");
      await expect(restoreStrengthAction(fd({ slug: "ss-31", variantId: "50mg" }))).rejects.toThrow(/reload/);
      expect(catalogChangedByOwner).toHaveBeenCalledTimes(2);
    });

    it("delete: ok refreshes; history says archive instead; missing throws", async () => {
      data.deleteVariant.mockResolvedValueOnce("ok").mockResolvedValueOnce("has_history").mockResolvedValueOnce("missing");
      const { deleteStrengthAction } = await import("@/app/admin/catalog/actions");
      expect(await deleteStrengthAction(null, fd({ slug: "ss-31", variantId: "30mg" }))).toEqual({ ok: "Deleted." });
      expect(data.deleteVariant).toHaveBeenCalledWith("ss-31", "30mg", "owner");
      expect(await deleteStrengthAction(null, fd({ slug: "ss-31", variantId: "50mg" }))).toEqual({ error: "This one has lots or orders, so archive it instead." });
      await expect(deleteStrengthAction(null, fd({ slug: "ss-31", variantId: "30mg" }))).rejects.toThrow(/reload/);
      expect(catalogChangedByOwner).toHaveBeenCalledTimes(1);
    });
  });

  describe("every action checks the owner first", () => {
    const cases: Array<[string, (m: typeof import("@/app/admin/catalog/actions")) => Promise<unknown>]> = [
      ["coaUploadAction", (m) => m.coaUploadAction("ABC-1234")],
      ["receiveLotAction", (m) => m.receiveLotAction(null, fd({ ...receive, intent: "draft" }))],
      ["putLiveAction", (m) => m.putLiveAction(fd({ lotId: VALID_UUID }))],
      ["retireAction", (m) => m.retireAction(fd({ lotId: VALID_UUID }))],
      ["correctCountAction", (m) => m.correctCountAction(null, fd({ lotId: VALID_UUID, direction: "add", vials: "1", reason: "found", note: "" }))],
      ["replaceCertificateAction", (m) => m.replaceCertificateAction(null, fd({ lotId: VALID_UUID, coaPath: "X/1700000000000.pdf" }))],
      ["setFieldAction", (m) => m.setFieldAction(null, fd({ slug: "ss-31", variantId: "50mg", field: "price", value: "$1" }))],
      ["setShownAction", (m) => m.setShownAction(fd({ slug: "bpc-157", shown: "false" }))],
      ["addStrengthAction", (m) => m.addStrengthAction(null, fd({ slug: "ss-31", amount: "30", unit: "mg", price: "99", lowAt: "10", sku: "" }))],
      ["setStrengthShownAction", (m) => m.setStrengthShownAction(fd({ slug: "ss-31", variantId: "30mg", shown: "true" }))],
      ["archiveStrengthAction", (m) => m.archiveStrengthAction(fd({ slug: "ss-31", variantId: "50mg" }))],
      ["restoreStrengthAction", (m) => m.restoreStrengthAction(fd({ slug: "ss-31", variantId: "50mg" }))],
      ["deleteStrengthAction", (m) => m.deleteStrengthAction(null, fd({ slug: "ss-31", variantId: "30mg" }))],
    ];

    it.each(cases)("%s", async (_name, run) => {
      requireOwner.mockRejectedValueOnce(new Error("NOT_FOUND"));
      const m = await import("@/app/admin/catalog/actions");
      await expect(run(m)).rejects.toThrow("NOT_FOUND");
      Object.values(data).forEach((f) => expect(f).not.toHaveBeenCalled());
    });
  });
});
