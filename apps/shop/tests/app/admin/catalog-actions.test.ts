import { describe, it, expect, vi, beforeEach } from "vitest";
import { ownerStaff } from "../../helpers/staff";

const requirePermission = vi.fn(async () => ownerStaff({ id: "owner", fullName: "Kearney Adams" }));
const data = {
  receiveLot: vi.fn(), updateDraftLot: vi.fn(), putLotLive: vi.fn(), correctCount: vi.fn(), retireLot: vi.fn(),
  setVariantField: vi.fn(), setShown: vi.fn(), createCoaUpload: vi.fn(), coaUploaded: vi.fn(), lotById: vi.fn(),
  variantRow: vi.fn(), addVariant: vi.fn(), setVariantShown: vi.fn(), archiveVariant: vi.fn(), restoreVariant: vi.fn(), deleteVariant: vi.fn(),
  lotDefaults: vi.fn(async () => ({ testCents: 25000, inboundPerBoxCents: 1500, labelPerVialCents: 40 })),
};
const coaData = {
  addCertificate: vi.fn(), addCorrection: vi.fn(), certificateById: vi.fn(), deleteDraftCertificate: vi.fn(), listLabs: vi.fn(), updateDraftCertificate: vi.fn(),
};
const runs = { lineById: vi.fn(), linkLot: vi.fn(), fillLotCostFromLine: vi.fn() };
vi.mock("@/lib/wholesale/runs-data", () => runs);
const catalogChangedByOwner = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("@/lib/catalog-ops/data", () => data);
vi.mock("@/lib/coa/data", () => coaData);
vi.mock("@/lib/catalog-live", () => ({ catalogChangedByOwner }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const VALID_UUID = "11111111-1111-4111-8111-111111111111";
const LAB = "22222222-2222-4222-8222-222222222222";
const receive = { slug: "bpc-157", variantId: "10mg", lotNumber: "BPC-2610-03", ordered: "200", counted: "196", damaged: "2", note: "Short 4; 2 cracked." };
// A valid first certificate (Receive a lot's optional block), matching the LAB fixture below.
const cert = (o: Record<string, string> = {}) => ({
  labId: LAB, reportNumber: "VGD-24109", testedOn: "2025-01-01", purity: "99.47", method: "HPLC+MS", measured: "",
  coaPath: "BPC-2610-03/1700000000000.pdf", certNote: "", result: "pass", verifyCode: "",
  test_identity: "pass", test_endotoxin: "pass", test_sterility: "not_tested", test_heavy_metals: "not_tested", test_fentanyl: "not_tested",
  ...o,
});

describe("catalog actions", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(data).forEach((f) => f.mockReset());
    Object.values(coaData).forEach((f) => f.mockReset());
    Object.values(runs).forEach((f) => f.mockReset());
    catalogChangedByOwner.mockReset(); alertOwner.mockReset();
    data.lotDefaults.mockResolvedValue({ testCents: 25000, inboundPerBoxCents: 1500, labelPerVialCents: 40 });
    data.variantRow.mockResolvedValue({ strength: "10 mg", shown: true, archived_at: null });
    coaData.listLabs.mockResolvedValue([{ id: LAB, active: true }]);
  });

  it("receive: saves a draft, alerts on a discrepancy, refreshes", async () => {
    data.receiveLot.mockResolvedValue({ ok: true, id: "l9" });
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    const r = await receiveLotAction(null, fd({ ...receive, intent: "draft" }));
    expect(r).toEqual({ ok: "Saved BPC-2610-03 as a draft." });
    expect(alertOwner).toHaveBeenCalledWith("A lot arrived short or damaged", expect.stringContaining("ordered 200, counted 196, damaged 2"));
    expect(catalogChangedByOwner).toHaveBeenCalled();
    expect(coaData.addCertificate).not.toHaveBeenCalled();
    expect(data.coaUploaded).not.toHaveBeenCalled();
  });

  it("received from a run page: saved as a draft and linked to that run's line (owner-only), cost copied", async () => {
    data.receiveLot.mockResolvedValue({ ok: true, id: "l9" });
    runs.lineById.mockResolvedValue({ id: VALID_UUID, run_id: "r1", slug: "bpc-157", variant_id: "10mg", supplier: "Nana", cost_cents: 5200 });
    runs.linkLot.mockResolvedValue(true);
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    const r = await receiveLotAction(null, fd({ ...receive, counted: "200", damaged: "0", note: "", intent: "draft", runLineId: VALID_UUID }));
    expect(r).toEqual({ ok: "Saved BPC-2610-03 and linked it to the run. Pass it there once the certificate checks out." });
    expect(requirePermission).toHaveBeenCalledWith("wholesale.manage");
    expect(runs.linkLot).toHaveBeenCalledWith(VALID_UUID, "l9", "owner");
    expect(runs.fillLotCostFromLine).toHaveBeenCalledWith("l9", expect.objectContaining({ supplier: "Nana" }), expect.objectContaining({ inboundPerBoxCents: 1500 }));
    expect(data.putLotLive).not.toHaveBeenCalled();
  });

  it("a run line for a different strength is refused", async () => {
    data.receiveLot.mockResolvedValue({ ok: true, id: "l9" });
    runs.lineById.mockResolvedValue({ id: VALID_UUID, run_id: "r1", slug: "tb-500", variant_id: "10mg" });
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    await expect(receiveLotAction(null, fd({ ...receive, counted: "200", damaged: "0", note: "", intent: "draft", runLineId: VALID_UUID }))).rejects.toThrow();
    expect(runs.linkLot).not.toHaveBeenCalled();
  });

  it("receive + put live goes live in the same step", async () => {
    data.receiveLot.mockResolvedValue({ ok: true, id: "l9" });
    data.putLotLive.mockResolvedValue("ok");
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    expect(await receiveLotAction(null, fd({ ...receive, counted: "200", damaged: "0", note: "", intent: "live" }))).toEqual({ ok: "BPC-2610-03 is live." });
    expect(data.putLotLive).toHaveBeenCalledWith("l9", "owner");
  });

  it("a taken lot number is a field error", async () => {
    data.receiveLot.mockResolvedValue({ ok: false, taken: true });
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    expect(await receiveLotAction(null, fd({ ...receive, intent: "draft" }))).toEqual({ fieldErrors: { lotNumber: "That lot number is already used." } });
  });

  it("a taken lot number does not refresh the live catalog", async () => {
    data.receiveLot.mockResolvedValue({ ok: false, taken: true });
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    await receiveLotAction(null, fd({ ...receive, intent: "draft" }));
    expect(catalogChangedByOwner).not.toHaveBeenCalled();
  });

  it.each([
    ["needs_purity", "Saved as a draft. Needs a passing purity certificate."],
    ["needs_endotoxin", "Saved as a draft. Needs a passing endotoxin result."],
    ["nothing_sellable", "Saved as a draft. Nothing to sell — every vial is damaged."],
  ])("receive + live refused as %s stays a draft and says why", async (reason, message) => {
    data.receiveLot.mockResolvedValue({ ok: true, id: "l9" });
    data.putLotLive.mockResolvedValue(reason);
    const { receiveLotAction } = await import("@/app/admin/catalog/actions");
    expect(await receiveLotAction(null, fd({ ...receive, counted: "200", damaged: "0", note: "", intent: "live" }))).toEqual({ error: message });
  });

  describe("with an optional first certificate", () => {
    it("saves the lot and the certificate", async () => {
      data.receiveLot.mockResolvedValue({ ok: true, id: "l9" });
      data.coaUploaded.mockResolvedValue(true);
      coaData.addCertificate.mockResolvedValue({ ok: true, id: "c1" });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      const r = await receiveLotAction(null, fd({ ...receive, ...cert(), intent: "draft" }));
      expect(r).toEqual({ ok: "Saved BPC-2610-03 as a draft." });
      expect(coaData.addCertificate).toHaveBeenCalledWith(
        { id: "l9", slug: "bpc-157", variant_id: "10mg" },
        expect.objectContaining({ reportNumber: "VGD-24109", labId: LAB }),
        "owner",
      );
    });

    it("a report number already recorded for this lab is reported after the lot is saved as a draft", async () => {
      data.receiveLot.mockResolvedValue({ ok: true, id: "l9" });
      data.coaUploaded.mockResolvedValue(true);
      coaData.addCertificate.mockResolvedValue({ ok: false, taken: true });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      const r = await receiveLotAction(null, fd({ ...receive, ...cert(), intent: "draft" }));
      expect(r).toEqual({ error: "Saved BPC-2610-03 as a draft, but that report number is already recorded for this lab — add the certificate from the lot." });
      expect(catalogChangedByOwner).toHaveBeenCalled();
    });

    it("refuses a certificate PDF outside the lot's folder before ever saving the lot", async () => {
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      const r = await receiveLotAction(null, fd({ ...receive, ...cert({ coaPath: "OTHER-LOT/1700000000000.pdf" }), intent: "draft" }));
      expect(r).toEqual({ fieldErrors: { coa: "The certificate didn't finish uploading — attach it again." } });
      expect(data.receiveLot).not.toHaveBeenCalled();
      expect(data.coaUploaded).not.toHaveBeenCalled();
    });

    it.each([
      ["a path under another lot", "OTHER-LOT/1700000000000.pdf"],
      ["a path traversal attempt", "BPC-2610-03/../1700000000000.pdf"],
    ])("refuses %s without ever checking storage or inserting", async (_label, coaPath) => {
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      expect(await receiveLotAction(null, fd({ ...receive, ...cert({ coaPath }), intent: "draft" })))
        .toEqual({ fieldErrors: { coa: "The certificate didn't finish uploading — attach it again." } });
      expect(data.coaUploaded).not.toHaveBeenCalled();
      expect(data.receiveLot).not.toHaveBeenCalled();
    });

    it("an invalid certificate field is a field error and nothing is saved", async () => {
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      const r = await receiveLotAction(null, fd({ ...receive, ...cert({ result: "" }), intent: "draft" }));
      expect(r?.fieldErrors?.result).toBe("Pick Pass or Failed.");
      expect(data.receiveLot).not.toHaveBeenCalled();
      expect(coaData.addCertificate).not.toHaveBeenCalled();
    });
  });

  describe("editing a draft", () => {
    // The draft as saved before this edit: same number, full count.
    const draft = (o: Record<string, unknown> = {}) => ({
      id: VALID_UUID, lot_number: "BPC-2610-03", slug: "bpc-157", status: "draft",
      ordered_qty: 200, counted_qty: 200, damaged_qty: 0, ...o,
    });
    beforeEach(() => { data.lotById.mockResolvedValue(draft()); });

    it("fires the discrepancy alert when the counts change into a discrepancy", async () => {
      data.updateDraftLot.mockResolvedValue({ ok: true });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      await receiveLotAction(null, fd({ ...receive, lotId: VALID_UUID, intent: "draft" }));
      expect(alertOwner).toHaveBeenCalledWith("A lot arrived short or damaged", expect.stringContaining("ordered 200, counted 196, damaged 2"));
    });

    it("re-saving a draft with the same discrepancy does not alert again", async () => {
      data.lotById.mockResolvedValue(draft({ counted_qty: 196, damaged_qty: 2 }));
      data.updateDraftLot.mockResolvedValue({ ok: true });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      expect(await receiveLotAction(null, fd({ ...receive, lotId: VALID_UUID, intent: "draft" }))).toEqual({ ok: "Saved BPC-2610-03 as a draft." });
      expect(alertOwner).not.toHaveBeenCalled();
    });

    it("changed counts that now add up do not alert", async () => {
      data.lotById.mockResolvedValue(draft({ counted_qty: 196, damaged_qty: 2 }));
      data.updateDraftLot.mockResolvedValue({ ok: true });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      await receiveLotAction(null, fd({ ...receive, counted: "200", damaged: "0", note: "", lotId: VALID_UUID, intent: "draft" }));
      expect(alertOwner).not.toHaveBeenCalled();
    });

    it("a different discrepancy alerts again", async () => {
      data.lotById.mockResolvedValue(draft({ counted_qty: 196, damaged_qty: 2 }));
      data.updateDraftLot.mockResolvedValue({ ok: true });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      await receiveLotAction(null, fd({ ...receive, counted: "190", lotId: VALID_UUID, intent: "draft" }));
      expect(alertOwner).toHaveBeenCalledWith("A lot arrived short or damaged", expect.stringContaining("ordered 200, counted 190, damaged 2"));
    });

    it("ignores any lab/certificate fields — certificates are added, edited and deleted on their own rows", async () => {
      data.updateDraftLot.mockResolvedValue({ ok: true });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      const r = await receiveLotAction(null, fd({ ...receive, ...cert(), lotId: VALID_UUID, intent: "draft" }));
      expect(r).toEqual({ ok: "Saved BPC-2610-03 as a draft." });
      expect(coaData.listLabs).not.toHaveBeenCalled();
      expect(coaData.addCertificate).not.toHaveBeenCalled();
      expect(data.coaUploaded).not.toHaveBeenCalled();
    });

    it("a lot that's gone or no longer a draft throws (stale) before saving", async () => {
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      data.lotById.mockResolvedValue(null);
      await expect(receiveLotAction(null, fd({ ...receive, lotId: VALID_UUID, intent: "draft" }))).rejects.toThrow(/reload/);
      data.lotById.mockResolvedValue(draft({ status: "live" }));
      await expect(receiveLotAction(null, fd({ ...receive, lotId: VALID_UUID, intent: "draft" }))).rejects.toThrow(/reload/);
      expect(data.updateDraftLot).not.toHaveBeenCalled();
    });

    it("a taken lot number is a field error", async () => {
      data.updateDraftLot.mockResolvedValue({ ok: false, taken: true });
      const { receiveLotAction } = await import("@/app/admin/catalog/actions");
      expect(await receiveLotAction(null, fd({ ...receive, lotId: VALID_UUID, intent: "draft" })))
        .toEqual({ fieldErrors: { lotNumber: "That lot number is already used." } });
    });

    it("a lot that's no longer a draft throws (stale)", async () => {
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

  it("put live maps a refusal reason to its message", async () => {
    data.putLotLive.mockResolvedValue("needs_purity");
    const { putLiveAction } = await import("@/app/admin/catalog/actions");
    await expect(putLiveAction(fd({ lotId: VALID_UUID }))).rejects.toThrow("Needs a passing purity certificate.");
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

  it("correct count: the message counts one vial as a vial", async () => {
    data.correctCount.mockResolvedValue("ok");
    data.lotById.mockResolvedValue({ slug: "mots-c" });
    const { correctCountAction } = await import("@/app/admin/catalog/actions");
    expect(await correctCountAction(null, fd({ lotId: VALID_UUID, direction: "remove", vials: "1", reason: "damaged", note: "" }))).toEqual({ ok: "Removed 1 vial." });
    expect(await correctCountAction(null, fd({ lotId: VALID_UUID, direction: "add", vials: "3", reason: "found", note: "" }))).toEqual({ ok: "Added 3 vials." });
  });

  describe("saveCertificateAction", () => {
    beforeEach(() => {
      data.lotById.mockResolvedValue({ id: VALID_UUID, lot_number: "BPC-2610-03", slug: "bpc-157", variant_id: "10mg", status: "live" });
    });

    it("refuses a PDF path outside the lot's folder without inserting", async () => {
      const { saveCertificateAction } = await import("@/app/admin/catalog/actions");
      expect(await saveCertificateAction(null, fd({ lotId: VALID_UUID, ...cert({ coaPath: "OTHER-LOT/1700000000000.pdf" }) })))
        .toEqual({ fieldErrors: { coa: "The certificate didn't finish uploading — attach it again." } });
      expect(data.coaUploaded).not.toHaveBeenCalled();
      expect(coaData.addCertificate).not.toHaveBeenCalled();
    });

    it("on a live lot adds (never edits) and returns 'Certificate added.'", async () => {
      data.coaUploaded.mockResolvedValue(true);
      coaData.addCertificate.mockResolvedValue({ ok: true, id: "c1" });
      const { saveCertificateAction } = await import("@/app/admin/catalog/actions");
      expect(await saveCertificateAction(null, fd({ lotId: VALID_UUID, ...cert() }))).toEqual({ ok: "Certificate added." });
      expect(coaData.addCertificate).toHaveBeenCalledWith({ id: VALID_UUID, slug: "bpc-157", variant_id: "10mg" }, expect.objectContaining({ reportNumber: "VGD-24109" }), "owner");
      expect(catalogChangedByOwner).toHaveBeenCalled();
    });

    it("on a draft lot with a certId edits", async () => {
      data.lotById.mockResolvedValue({ id: VALID_UUID, lot_number: "BPC-2610-03", slug: "bpc-157", variant_id: "10mg", status: "draft" });
      data.coaUploaded.mockResolvedValue(true);
      coaData.updateDraftCertificate.mockResolvedValue({ ok: true });
      const { saveCertificateAction } = await import("@/app/admin/catalog/actions");
      expect(await saveCertificateAction(null, fd({ lotId: VALID_UUID, certId: VALID_UUID, ...cert() }))).toEqual({ ok: "Certificate saved." });
      expect(coaData.updateDraftCertificate).toHaveBeenCalledWith(VALID_UUID, { id: VALID_UUID, slug: "bpc-157", variant_id: "10mg" }, expect.objectContaining({ reportNumber: "VGD-24109" }), "owner");
    });

    it("editing a certificate on a live lot is refused (locked) — add a re-test instead", async () => {
      data.coaUploaded.mockResolvedValue(true);
      const { saveCertificateAction } = await import("@/app/admin/catalog/actions");
      await expect(saveCertificateAction(null, fd({ lotId: VALID_UUID, certId: VALID_UUID, ...cert() }))).rejects.toThrow(/reload/);
      expect(coaData.updateDraftCertificate).not.toHaveBeenCalled();
    });

    it("a taken report number is a field error", async () => {
      data.coaUploaded.mockResolvedValue(true);
      coaData.addCertificate.mockResolvedValue({ ok: false, taken: true });
      const { saveCertificateAction } = await import("@/app/admin/catalog/actions");
      expect(await saveCertificateAction(null, fd({ lotId: VALID_UUID, ...cert() })))
        .toEqual({ fieldErrors: { reportNumber: "That report number is already recorded for this lab." } });
    });

    it("a fail result with a note returns ok plus a Recorded as Failed warning", async () => {
      data.coaUploaded.mockResolvedValue(true);
      coaData.addCertificate.mockResolvedValue({ ok: true, id: "c1" });
      const { saveCertificateAction } = await import("@/app/admin/catalog/actions");
      expect(await saveCertificateAction(null, fd({ lotId: VALID_UUID, ...cert({ result: "fail", certNote: "Short fill." }) })))
        .toEqual({ ok: "Certificate added.", warning: "Recorded as Failed." });
    });

    it("Pass with a failed test saves and warns which test failed", async () => {
      data.coaUploaded.mockResolvedValue(true);
      coaData.addCertificate.mockResolvedValue({ ok: true, id: "c1" });
      const { saveCertificateAction } = await import("@/app/admin/catalog/actions");
      expect(await saveCertificateAction(null, fd({ lotId: VALID_UUID, ...cert({ test_endotoxin: "fail" }) })))
        .toEqual({ ok: "Certificate added.", warning: "Saved as Pass although Endotoxin failed on this report." });
    });

    it("throws stale when the lot no longer exists", async () => {
      data.lotById.mockResolvedValue(null);
      const { saveCertificateAction } = await import("@/app/admin/catalog/actions");
      await expect(saveCertificateAction(null, fd({ lotId: VALID_UUID, ...cert() }))).rejects.toThrow(/reload/);
    });

    it("an invalid certificate field is a field error, without checking storage or inserting", async () => {
      const { saveCertificateAction } = await import("@/app/admin/catalog/actions");
      const r = await saveCertificateAction(null, fd({ lotId: VALID_UUID, ...cert({ result: "" }) }));
      expect(r?.fieldErrors?.result).toBe("Pick Pass or Failed.");
      expect(data.coaUploaded).not.toHaveBeenCalled();
      expect(coaData.addCertificate).not.toHaveBeenCalled();
    });
  });

  describe("deleteCertificateAction", () => {
    it("deletes a draft certificate and refreshes", async () => {
      coaData.certificateById.mockResolvedValue({ id: VALID_UUID, lot_id: "l1", slug: "bpc-157", variant_id: "10mg", lot_status: "draft", report_number: "VGD-24109" });
      coaData.deleteDraftCertificate.mockResolvedValue({ ok: true });
      const { deleteCertificateAction } = await import("@/app/admin/catalog/actions");
      await deleteCertificateAction(fd({ certId: VALID_UUID }));
      expect(coaData.deleteDraftCertificate).toHaveBeenCalledWith(VALID_UUID, { id: "l1", slug: "bpc-157", variant_id: "10mg" }, "VGD-24109", "owner");
      expect(catalogChangedByOwner).toHaveBeenCalled();
    });

    it("a live lot's certificate throws stale", async () => {
      coaData.certificateById.mockResolvedValue({ id: VALID_UUID, lot_id: "l1", slug: "bpc-157", variant_id: "10mg", lot_status: "live", report_number: "VGD-24109" });
      const { deleteCertificateAction } = await import("@/app/admin/catalog/actions");
      await expect(deleteCertificateAction(fd({ certId: VALID_UUID }))).rejects.toThrow(/reload/);
      expect(coaData.deleteDraftCertificate).not.toHaveBeenCalled();
    });

    it("a missing certificate throws stale", async () => {
      coaData.certificateById.mockResolvedValue(null);
      const { deleteCertificateAction } = await import("@/app/admin/catalog/actions");
      await expect(deleteCertificateAction(fd({ certId: VALID_UUID }))).rejects.toThrow(/reload/);
    });

    it("the SQL lock winning a race throws stale", async () => {
      coaData.certificateById.mockResolvedValue({ id: VALID_UUID, lot_id: "l1", slug: "bpc-157", variant_id: "10mg", lot_status: "draft", report_number: "VGD-24109" });
      coaData.deleteDraftCertificate.mockResolvedValue({ ok: false });
      const { deleteCertificateAction } = await import("@/app/admin/catalog/actions");
      await expect(deleteCertificateAction(fd({ certId: VALID_UUID }))).rejects.toThrow(/reload/);
    });
  });

  describe("correctCertificateAction", () => {
    it("an empty note is a field error", async () => {
      coaData.certificateById.mockResolvedValue({ id: VALID_UUID, lot_id: "l1", slug: "bpc-157", variant_id: "10mg", correction_note: null });
      const { correctCertificateAction } = await import("@/app/admin/catalog/actions");
      expect(await correctCertificateAction(null, fd({ certId: VALID_UUID, correction: "   " })))
        .toEqual({ fieldErrors: { correction: "Say what was wrong and what's right." } });
      expect(coaData.addCorrection).not.toHaveBeenCalled();
    });

    it("adds a correction with the old note and confirms", async () => {
      coaData.certificateById.mockResolvedValue({ id: VALID_UUID, lot_id: "l1", slug: "bpc-157", variant_id: "10mg", correction_note: "Old note." });
      const { correctCertificateAction } = await import("@/app/admin/catalog/actions");
      expect(await correctCertificateAction(null, fd({ certId: VALID_UUID, correction: "Report number was mistyped; corrected to VGD-24109." })))
        .toEqual({ ok: "Correction added. Customers see it on the certificate." });
      expect(coaData.addCorrection).toHaveBeenCalledWith(VALID_UUID, { id: "l1", slug: "bpc-157", variant_id: "10mg" }, "Old note.", "Report number was mistyped; corrected to VGD-24109.", "owner");
      expect(catalogChangedByOwner).toHaveBeenCalled();
    });

    it("throws stale when the certificate no longer exists", async () => {
      coaData.certificateById.mockResolvedValue(null);
      const { correctCertificateAction } = await import("@/app/admin/catalog/actions");
      await expect(correctCertificateAction(null, fd({ certId: VALID_UUID, correction: "x" }))).rejects.toThrow(/reload/);
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
      ["saveCertificateAction", (m) => m.saveCertificateAction(null, fd({ lotId: VALID_UUID, ...cert() }))],
      ["deleteCertificateAction", (m) => m.deleteCertificateAction(fd({ certId: VALID_UUID }))],
      ["correctCertificateAction", (m) => m.correctCertificateAction(null, fd({ certId: VALID_UUID, correction: "x" }))],
      ["setFieldAction", (m) => m.setFieldAction(null, fd({ slug: "ss-31", variantId: "50mg", field: "price", value: "$1" }))],
      ["setShownAction", (m) => m.setShownAction(fd({ slug: "bpc-157", shown: "false" }))],
      ["addStrengthAction", (m) => m.addStrengthAction(null, fd({ slug: "ss-31", amount: "30", unit: "mg", price: "99", lowAt: "10", sku: "" }))],
      ["setStrengthShownAction", (m) => m.setStrengthShownAction(fd({ slug: "ss-31", variantId: "30mg", shown: "true" }))],
      ["archiveStrengthAction", (m) => m.archiveStrengthAction(fd({ slug: "ss-31", variantId: "50mg" }))],
      ["restoreStrengthAction", (m) => m.restoreStrengthAction(fd({ slug: "ss-31", variantId: "50mg" }))],
      ["deleteStrengthAction", (m) => m.deleteStrengthAction(null, fd({ slug: "ss-31", variantId: "30mg" }))],
    ];

    it.each(cases)("%s", async (_name, run) => {
      requirePermission.mockRejectedValueOnce(new Error("NOT_FOUND"));
      const m = await import("@/app/admin/catalog/actions");
      await expect(run(m)).rejects.toThrow("NOT_FOUND");
      [...Object.values(data), ...Object.values(coaData)].forEach((f) => expect(f).not.toHaveBeenCalled());
    });
  });
});
