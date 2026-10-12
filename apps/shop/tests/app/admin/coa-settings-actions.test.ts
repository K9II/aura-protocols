import { describe, it, expect, vi, beforeEach } from "vitest";
import { ownerStaff } from "../../helpers/staff";
import { NOT_RECORDED_LAB } from "@/lib/coa/rules";

const requirePermission = vi.fn(async () => ownerStaff({ id: "owner", fullName: "Kearney Adams" }));
const coaData = { saveLab: vi.fn(), setCoaSetting: vi.fn(), setLabActive: vi.fn(), labById: vi.fn() };
const catalogChangedByOwner = vi.fn();
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("@/lib/coa/data", () => coaData);
vi.mock("@/lib/catalog-live", () => ({ catalogChangedByOwner }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const VALID_UUID = "11111111-1111-4111-8111-111111111111";
const labForm = { name: "Vanguard Laboratory", city: "Olympia, WA", verify: "https://verifiedbyvanguard.com/verify/{report}", iso: "on", hint: "" };

describe("coa settings actions", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(coaData).forEach((f) => f.mockReset());
    catalogChangedByOwner.mockReset();
  });

  describe("setCoaSettingAction", () => {
    it("toggles a known setting and refreshes the catalog", async () => {
      const { setCoaSettingAction } = await import("@/app/admin/catalog/settings/actions");
      await setCoaSettingAction(fd({ key: "showAll", on: "true" }));
      expect(coaData.setCoaSetting).toHaveBeenCalledWith("showAll", true);
      expect(catalogChangedByOwner).toHaveBeenCalled();
    });

    it("toggles the other known setting off", async () => {
      const { setCoaSettingAction } = await import("@/app/admin/catalog/settings/actions");
      await setCoaSettingAction(fd({ key: "showMeasured", on: "false" }));
      expect(coaData.setCoaSetting).toHaveBeenCalledWith("showMeasured", false);
    });

    it("rejects an unknown setting key without writing", async () => {
      const { setCoaSettingAction } = await import("@/app/admin/catalog/settings/actions");
      await expect(setCoaSettingAction(fd({ key: "bogus", on: "true" }))).rejects.toThrow("Unknown setting.");
      expect(coaData.setCoaSetting).not.toHaveBeenCalled();
    });
  });

  describe("saveLabAction", () => {
    it("adds a new lab and refreshes", async () => {
      coaData.saveLab.mockResolvedValue({ ok: true });
      const { saveLabAction } = await import("@/app/admin/catalog/settings/actions");
      const { revalidatePath } = await import("next/cache");
      expect(await saveLabAction(null, fd(labForm))).toEqual({ ok: "Lab added.", name: "Vanguard Laboratory" });
      expect(coaData.saveLab).toHaveBeenCalledWith(null, expect.objectContaining({ name: "Vanguard Laboratory" }));
      expect(catalogChangedByOwner).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/admin/catalog", "layout");
      // Add lab also opens from the wholesale run page's Receive lot form.
      expect(revalidatePath).toHaveBeenCalledWith("/admin/wholesale/runs", "layout");
    });

    it("edits an existing lab by id", async () => {
      coaData.saveLab.mockResolvedValue({ ok: true });
      const { saveLabAction } = await import("@/app/admin/catalog/settings/actions");
      expect(await saveLabAction(null, fd({ ...labForm, labId: VALID_UUID }))).toEqual({ ok: "Lab saved.", name: "Vanguard Laboratory" });
      expect(coaData.saveLab).toHaveBeenCalledWith(VALID_UUID, expect.anything());
    });

    it("returns field errors from parseLab without writing", async () => {
      const { saveLabAction } = await import("@/app/admin/catalog/settings/actions");
      expect(await saveLabAction(null, fd({ ...labForm, name: "" }))).toEqual({ fieldErrors: { name: "The lab's name, 2–80 characters." } });
      expect(coaData.saveLab).not.toHaveBeenCalled();
    });

    it("a taken name is a field error", async () => {
      coaData.saveLab.mockResolvedValue({ ok: false, taken: true });
      const { saveLabAction } = await import("@/app/admin/catalog/settings/actions");
      expect(await saveLabAction(null, fd(labForm))).toEqual({ fieldErrors: { name: "A lab with that name already exists." } });
    });

    it("passes the verify hint through to parseLab", async () => {
      coaData.saveLab.mockResolvedValue({ ok: true });
      const { saveLabAction } = await import("@/app/admin/catalog/settings/actions");
      await saveLabAction(null, fd({ ...labForm, hint: "The certificate ID from the QR code." }));
      expect(coaData.saveLab).toHaveBeenCalledWith(null, expect.objectContaining({ verifyHint: "The certificate ID from the QR code." }));
    });

    it("refuses to edit the Not recorded placeholder lab", async () => {
      coaData.labById.mockResolvedValue({ id: VALID_UUID, name: NOT_RECORDED_LAB });
      const { saveLabAction } = await import("@/app/admin/catalog/settings/actions");
      await expect(saveLabAction(null, fd({ ...labForm, labId: VALID_UUID }))).rejects.toThrow();
      expect(coaData.saveLab).not.toHaveBeenCalled();
    });
  });

  describe("setLabActiveAction", () => {
    it("sets active state and refreshes", async () => {
      const { setLabActiveAction } = await import("@/app/admin/catalog/settings/actions");
      await setLabActiveAction(fd({ labId: VALID_UUID, active: "false" }));
      expect(coaData.setLabActive).toHaveBeenCalledWith(VALID_UUID, false);
      expect(catalogChangedByOwner).toHaveBeenCalled();
    });

    it("refuses to (re)activate the Not recorded placeholder lab", async () => {
      coaData.labById.mockResolvedValue({ id: VALID_UUID, name: NOT_RECORDED_LAB });
      const { setLabActiveAction } = await import("@/app/admin/catalog/settings/actions");
      await expect(setLabActiveAction(fd({ labId: VALID_UUID, active: "true" }))).rejects.toThrow();
      expect(coaData.setLabActive).not.toHaveBeenCalled();
    });
  });

  describe("every action checks the owner first", () => {
    const cases: Array<[string, (m: typeof import("@/app/admin/catalog/settings/actions")) => Promise<unknown>]> = [
      ["setCoaSettingAction", (m) => m.setCoaSettingAction(fd({ key: "showAll", on: "true" }))],
      ["saveLabAction", (m) => m.saveLabAction(null, fd(labForm))],
      ["setLabActiveAction", (m) => m.setLabActiveAction(fd({ labId: VALID_UUID, active: "true" }))],
    ];

    it.each(cases)("%s", async (_name, run) => {
      requirePermission.mockRejectedValueOnce(new Error("NOT_FOUND"));
      const m = await import("@/app/admin/catalog/settings/actions");
      await expect(run(m)).rejects.toThrow("NOT_FOUND");
      Object.values(coaData).forEach((f) => expect(f).not.toHaveBeenCalled());
    });
  });
});
