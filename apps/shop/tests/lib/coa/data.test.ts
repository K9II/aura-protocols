import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";
import type { CertValue, LabValue } from "@/lib/coa/rules";

const rpc = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), rpc }) }));

const LOT = { id: "lot1", slug: "bpc-157", variant_id: "10mg" };
const cert = (x: Partial<CertValue> = {}): CertValue => ({
  labId: "lab1", reportNumber: "VGD-24109", testedOn: "2026-10-05", purityPct: 99.47, method: "HPLC+MS", measuredMg: 10.42,
  coaPath: "AP-1105/1791758296000.pdf", note: null, result: "pass", verifyCode: null,
  tests: { identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
  ...x,
});

describe("coa data", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); });

  describe("addCertificate", () => {
    it("inserts the row (result, tests spread into columns, created_by) then logs certificate_added", async () => {
      const ins = query({ data: { id: "c1" } });
      const ev = query({});
      from = fromQueue({ lot_certificates: [ins], catalog_events: [ev] });
      const { addCertificate } = await import("@/lib/coa/data");
      const v = cert();
      expect(await addCertificate(LOT, v, "owner")).toEqual({ ok: true, id: "c1" });
      expect(callArgs(ins, "insert")?.[0]).toMatchObject({
        lot_id: "lot1", lab_id: "lab1", report_number: "VGD-24109", result: "pass", created_by: "owner",
        identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested",
      });
      expect(callArgs(ev, "insert")?.[0]).toMatchObject({
        kind: "certificate_added", lot_id: "lot1", variant_id: "10mg", actor_id: "owner",
        after: { lab: "lab1", report: "VGD-24109" },
      });
    });

    it("writes the verify code column", async () => {
      const ins = query({ data: { id: "c1" } });
      from = fromQueue({ lot_certificates: [ins], catalog_events: [query({})] });
      const { addCertificate } = await import("@/lib/coa/data");
      await addCertificate(LOT, cert({ verifyCode: "dGMrBI-hahnc3q-z" }), "owner");
      expect(callArgs(ins, "insert")?.[0]).toMatchObject({ verify_code: "dGMrBI-hahnc3q-z" });
    });

    it("returns { ok: false, taken: true } on a duplicate report number (23505), without logging", async () => {
      const ins = query({ error: { code: "23505", message: "dup" } });
      from = fromQueue({ lot_certificates: [ins] });
      const { addCertificate } = await import("@/lib/coa/data");
      expect(await addCertificate(LOT, cert(), "owner")).toEqual({ ok: false, taken: true });
    });

    it("throws on any other insert error", async () => {
      from = fromQueue({ lot_certificates: [query({ error: { message: "down" } })] });
      const { addCertificate } = await import("@/lib/coa/data");
      await expect(addCertificate(LOT, cert(), "owner")).rejects.toThrow(/certificate insert failed/);
    });
  });

  describe("updateDraftCertificate", () => {
    it("updates the row filtered by id and lot_id, and logs certificate_edited", async () => {
      const upd = query({ data: [{ id: "c1" }] });
      const ev = query({});
      from = fromQueue({ lot_certificates: [upd], catalog_events: [ev] });
      const { updateDraftCertificate } = await import("@/lib/coa/data");
      expect(await updateDraftCertificate("c1", LOT, cert(), "owner")).toEqual({ ok: true });
      expect(upd.calls.filter(([m]) => m === "eq").map(([, a]) => a)).toEqual([["id", "c1"], ["lot_id", "lot1"]]);
      expect(callArgs(ev, "insert")?.[0]).toMatchObject({ kind: "certificate_edited", lot_id: "lot1" });
    });

    it("returns { ok: false, locked: true } when the error message contains certificate_locked", async () => {
      from = fromQueue({ lot_certificates: [query({ error: { message: "certificate_locked: this lot is live" } })] });
      const { updateDraftCertificate } = await import("@/lib/coa/data");
      expect(await updateDraftCertificate("c1", LOT, cert(), "owner")).toEqual({ ok: false, locked: true });
    });

    it("returns { ok: false, taken: true } on a duplicate report number", async () => {
      from = fromQueue({ lot_certificates: [query({ error: { code: "23505", message: "dup" } })] });
      const { updateDraftCertificate } = await import("@/lib/coa/data");
      expect(await updateDraftCertificate("c1", LOT, cert(), "owner")).toEqual({ ok: false, taken: true });
    });

    it("throws on any other error", async () => {
      from = fromQueue({ lot_certificates: [query({ error: { message: "down" } })] });
      const { updateDraftCertificate } = await import("@/lib/coa/data");
      await expect(updateDraftCertificate("c1", LOT, cert(), "owner")).rejects.toThrow(/certificate update failed/);
    });

    it("returns { ok: false } without logging when no row comes back (the lot went stale)", async () => {
      const upd = query({ data: [] });
      from = fromQueue({ lot_certificates: [upd] });
      const { updateDraftCertificate } = await import("@/lib/coa/data");
      expect(await updateDraftCertificate("c1", LOT, cert(), "owner")).toEqual({ ok: false });
      // No catalog_events queue entry: logEvent would throw "unexpected supabase.from" if called.
    });
  });

  describe("deleteDraftCertificate", () => {
    it("deletes the row filtered by id and lot_id, and logs certificate_deleted", async () => {
      const del = query({ data: [{ id: "c1" }] });
      const ev = query({});
      from = fromQueue({ lot_certificates: [del], catalog_events: [ev] });
      const { deleteDraftCertificate } = await import("@/lib/coa/data");
      expect(await deleteDraftCertificate("c1", LOT, "VGD-24109", "owner")).toEqual({ ok: true });
      expect(del.calls.filter(([m]) => m === "eq").map(([, a]) => a)).toEqual([["id", "c1"], ["lot_id", "lot1"]]);
      expect(callArgs(ev, "insert")?.[0]).toMatchObject({ kind: "certificate_deleted", before: { report: "VGD-24109" } });
    });

    it("returns { ok: false } without throwing when the certificate is locked", async () => {
      from = fromQueue({ lot_certificates: [query({ error: { message: "certificate_locked" } })] });
      const { deleteDraftCertificate } = await import("@/lib/coa/data");
      expect(await deleteDraftCertificate("c1", LOT, "VGD-24109", "owner")).toEqual({ ok: false });
    });

    it("returns { ok: false } without logging when no row comes back (the lot went stale)", async () => {
      const del = query({ data: [] });
      from = fromQueue({ lot_certificates: [del] });
      const { deleteDraftCertificate } = await import("@/lib/coa/data");
      expect(await deleteDraftCertificate("c1", LOT, "VGD-24109", "owner")).toEqual({ ok: false });
    });
  });

  describe("addCorrection", () => {
    it("updates only correction_note, corrected_at and corrected_by, and logs certificate_corrected with before/after", async () => {
      const upd = query({});
      const ev = query({});
      from = fromQueue({ lot_certificates: [upd], catalog_events: [ev] });
      const { addCorrection } = await import("@/lib/coa/data");
      await addCorrection("c1", LOT, "earlier note", "corrected note", "owner");
      const row = callArgs(upd, "update")?.[0] as Record<string, unknown>;
      expect(Object.keys(row).sort()).toEqual(["corrected_at", "corrected_by", "correction_note"]);
      expect(row.correction_note).toBe("corrected note");
      expect(row.corrected_by).toBe("owner");
      expect(callArgs(ev, "insert")?.[0]).toMatchObject({
        kind: "certificate_corrected", actor_id: "owner",
        before: { correction: "earlier note" }, after: { correction: "corrected note" },
      });
    });
  });

  describe("coaSettings / setCoaSetting", () => {
    it("reads the two switches", async () => {
      from = fromQueue({ shop_settings: [query({ data: { coa_show_all: true, coa_show_measured: false } })] });
      const { coaSettings } = await import("@/lib/coa/data");
      expect(await coaSettings()).toEqual({ showAll: true, showMeasured: false });
    });

    it("falls back to defaults when no row exists", async () => {
      from = fromQueue({ shop_settings: [query({ data: null })] });
      const { coaSettings } = await import("@/lib/coa/data");
      expect(await coaSettings()).toEqual({ showAll: false, showMeasured: false });
    });

    it('setCoaSetting("showAll", true) updates shop_settings.coa_show_all where id = true', async () => {
      const upd = query({});
      from = fromQueue({ shop_settings: [upd] });
      const { setCoaSetting } = await import("@/lib/coa/data");
      await setCoaSetting("showAll", true);
      expect(callArgs(upd, "update")?.[0]).toEqual({ coa_show_all: true });
      expect(callArgs(upd, "eq")).toEqual(["id", true]);
    });

    it('setCoaSetting("showMeasured", false) updates coa_show_measured', async () => {
      const upd = query({});
      from = fromQueue({ shop_settings: [upd] });
      const { setCoaSetting } = await import("@/lib/coa/data");
      await setCoaSetting("showMeasured", false);
      expect(callArgs(upd, "update")?.[0]).toEqual({ coa_show_measured: false });
    });
  });

  describe("saveLab", () => {
    const lab = (x: Partial<LabValue> = {}): LabValue => ({ name: "Vanguard Laboratory", city: "Boise, ID", verifyUrlTemplate: null, iso17025: true, verifyHint: null, ...x });

    it("inserts a new lab when id is null", async () => {
      const ins = query({});
      from = fromQueue({ labs: [ins] });
      const { saveLab } = await import("@/lib/coa/data");
      expect(await saveLab(null, lab())).toEqual({ ok: true });
      expect(callArgs(ins, "insert")?.[0]).toMatchObject({ name: "Vanguard Laboratory", city: "Boise, ID", iso17025: true });
      expect(from).toHaveBeenCalledWith("labs");
    });

    it("updates an existing lab by id", async () => {
      const upd = query({});
      from = fromQueue({ labs: [upd] });
      const { saveLab } = await import("@/lib/coa/data");
      expect(await saveLab("lab1", lab())).toEqual({ ok: true });
      expect(callArgs(upd, "eq")).toEqual(["id", "lab1"]);
    });

    it("writes the verify hint", async () => {
      const ins = query({});
      from = fromQueue({ labs: [ins] });
      const { saveLab } = await import("@/lib/coa/data");
      await saveLab(null, lab({ verifyHint: "The certificate ID from the QR code." }));
      expect(callArgs(ins, "insert")?.[0]).toMatchObject({ verify_hint: "The certificate ID from the QR code." });
    });

    it("reports taken on a duplicate name", async () => {
      from = fromQueue({ labs: [query({ error: { code: "23505", message: "dup" } })] });
      const { saveLab } = await import("@/lib/coa/data");
      expect(await saveLab(null, lab())).toEqual({ ok: false, taken: true });
    });

    it("throws on any other error", async () => {
      from = fromQueue({ labs: [query({ error: { message: "down" } })] });
      const { saveLab } = await import("@/lib/coa/data");
      await expect(saveLab(null, lab())).rejects.toThrow(/lab save failed/);
    });
  });

  describe("labById", () => {
    it("reads the id and name", async () => {
      from = fromQueue({ labs: [query({ data: { id: "lab1", name: "Not recorded" } })] });
      const { labById } = await import("@/lib/coa/data");
      expect(await labById("lab1")).toEqual({ id: "lab1", name: "Not recorded" });
    });

    it("returns null when not found", async () => {
      from = fromQueue({ labs: [query({ data: null })] });
      const { labById } = await import("@/lib/coa/data");
      expect(await labById("missing")).toBeNull();
    });

    it("throws on a read error", async () => {
      from = fromQueue({ labs: [query({ error: { message: "down" } })] });
      const { labById } = await import("@/lib/coa/data");
      await expect(labById("lab1")).rejects.toThrow(/lab read failed/);
    });
  });

  describe("setLabActive", () => {
    it("updates active", async () => {
      const upd = query({});
      from = fromQueue({ labs: [upd] });
      const { setLabActive } = await import("@/lib/coa/data");
      await setLabActive("lab1", false);
      expect(callArgs(upd, "update")?.[0]).toMatchObject({ active: false });
      expect(callArgs(upd, "eq")).toEqual(["id", "lab1"]);
    });
  });

  describe("listLabs", () => {
    it("reads the verify hint and rolls up the certificate count", async () => {
      from = fromQueue({
        labs: [query({ data: [{ id: "lab1", name: "Vanguard Laboratory", city: "Boise, ID", verify_url_template: null, verify_hint: "a hint", iso17025: true, active: true, lot_certificates: [{ count: 4 }] }] })],
      });
      const { listLabs } = await import("@/lib/coa/data");
      expect(await listLabs()).toEqual([{ id: "lab1", name: "Vanguard Laboratory", city: "Boise, ID", verify_url_template: null, verify_hint: "a hint", iso17025: true, active: true, certificates: 4 }]);
    });
  });

  describe("adminCertificates", () => {
    it("reads every certificate of a product's lots, stripping the joined lots column", async () => {
      from = fromQueue({ lot_certificates: [query({ data: [{ id: "c1", purity_pct: "99.40", measured_mg: null, lots: { slug: "bpc-157" } }] })] });
      const { adminCertificates } = await import("@/lib/coa/data");
      const rows = await adminCertificates("bpc-157");
      expect(rows[0]).not.toHaveProperty("lots");
      expect(rows[0].purity_pct).toBe(99.4);
    });
  });

  describe("allPublicCertRows", () => {
    it("reads every certificate of a non-draft lot, stripping the joined lots column", async () => {
      from = fromQueue({ lot_certificates: [query({ data: [{ id: "c1", purity_pct: "99.40", measured_mg: null, lots: { status: "live" } }] })] });
      const { allPublicCertRows } = await import("@/lib/coa/data");
      const rows = await allPublicCertRows();
      expect(rows[0]).not.toHaveProperty("lots");
      expect(rows[0].purity_pct).toBe(99.4);
      expect(from).toHaveBeenCalledWith("lot_certificates");
    });

    it("throws on a read error", async () => {
      from = fromQueue({ lot_certificates: [query({ error: { message: "down" } })] });
      const { allPublicCertRows } = await import("@/lib/coa/data");
      await expect(allPublicCertRows()).rejects.toThrow(/certificates read failed/);
    });
  });

  describe("certificateById", () => {
    it("returns the certificate with its lot's identifiers, stripping the joined lots column", async () => {
      from = fromQueue({ lot_certificates: [query({ data: { id: "c1", purity_pct: "99.40", measured_mg: null, lots: { lot_number: "BPC-2610-03", slug: "bpc-157", variant_id: "10mg", status: "live" } } })] });
      const { certificateById } = await import("@/lib/coa/data");
      const row = await certificateById("c1");
      expect(row).not.toHaveProperty("lots");
      expect(row).toMatchObject({ lot_number: "BPC-2610-03", slug: "bpc-157", variant_id: "10mg", lot_status: "live" });
    });

    it("returns null when not found", async () => {
      from = fromQueue({ lot_certificates: [query({ data: null })] });
      const { certificateById } = await import("@/lib/coa/data");
      expect(await certificateById("missing")).toBeNull();
    });
  });
});
