"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { can } from "@/lib/staff/roles";
import { catalogContent } from "@/data/catalog";
import { addVariant, archiveVariant, coaUploaded, correctCount, createCoaUpload, deleteVariant, lotById, putLotLive, receiveLot, restoreVariant, retireLot, setShown, setVariantField, setVariantShown, setVariantWholesale, updateDraftLot, variantRow, lotDefaults } from "@/lib/catalog-ops/data";
import { fillLotCostFromLine, lineById, linkLot } from "@/lib/wholesale/runs-data";
import {
  isCoaPathFor, isDiscrepancy, LOT_NUMBER_RE, parseCorrection, parseLowAt, parsePrice, parseReceive, parseSku, parseStrength,
} from "@/lib/catalog-ops/rules";
import { addCertificate, addCorrection, certificateById, deleteDraftCertificate, listLabs, updateDraftCertificate } from "@/lib/coa/data";
import { CORRECTION_MAX, parseCertificate, TEST_KEYS, type CertInput } from "@/lib/coa/rules";
import { catalogChangedByOwner } from "@/lib/catalog-live";
import { alertOwner } from "@/lib/notify";

export type ActionState = { ok?: string; error?: string; warning?: string; fieldErrors?: Record<string, string> } | null;

const STALE = "That lot changed — reload the page.";
const PRODUCT_STALE = "That product changed — reload the page.";
const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const today = () => new Date().toISOString().slice(0, 10);
const uuid = (f: FormData, k: string) => { const r = z.string().uuid().safeParse(f.get(k)); if (!r.success) throw new Error(STALE); return r.data; };
const productOf = (slug: string) => {
  const c = catalogContent.find((x) => x.slug === slug);
  if (!c) throw new Error(PRODUCT_STALE);
  return c;
};
// Strengths live in the database: it must exist and, for anything but a
// restore or delete, not be archived (hidden strengths are fine — the owner
// receives a lot for a new strength before showing it).
const variantOf = async (slug: string, variantId: string) => {
  const c = productOf(slug);
  const v = await variantRow(slug, variantId);
  if (!v || v.archived_at) throw new Error(PRODUCT_STALE);
  return { c, v };
};
const refresh = (slug: string) => { catalogChangedByOwner(); revalidatePath("/admin/catalog"); revalidatePath(`/admin/catalog/${slug}`); };
const receiveInput = (f: FormData) => ({
  lotNumber: str(f, "lotNumber"),
  ordered: str(f, "ordered"), counted: str(f, "counted"), damaged: str(f, "damaged"), note: str(f, "note"),
  supplier: str(f, "supplier"), cost: str(f, "cost"), testCost: str(f, "testCost"), freight: str(f, "freight"), labels: str(f, "labels"),
});
const certInput = (f: FormData): CertInput => ({
  labId: str(f, "labId"), reportNumber: str(f, "reportNumber"), testedOn: str(f, "testedOn"), purity: str(f, "purity"), method: str(f, "method"),
  measured: str(f, "measured"), coaPath: str(f, "coaPath"), certNote: str(f, "certNote"), result: str(f, "result"), verifyCode: str(f, "verifyCode"),
  ...Object.fromEntries(TEST_KEYS.map((k) => [`test_${k}`, str(f, `test_${k}`)])) as Pick<CertInput, `test_${(typeof TEST_KEYS)[number]}`>,
});
const activeLabIds = async () => new Set((await listLabs()).filter((l) => l.active).map((l) => l.id));
// Checks the uploaded PDF belongs to this lot's folder and finished uploading.
async function pdfOk(lotNumber: string, path: string) {
  return isCoaPathFor(lotNumber, path) && await coaUploaded(path);
}
const LIVE_REFUSAL: Record<string, string> = {
  needs_purity: "Needs a passing purity certificate.",
  needs_endotoxin: "Needs a passing endotoxin result.",
  nothing_sellable: "Nothing to sell — every vial is damaged.",
};
const TAKEN = "That report number is already recorded for this lab.";
// Same precedence as saveCertificateAction: the owner's Failed call wins, then
// a flagged failed test, then a below-floor purity warning.
const certWarning = (p: { value: { result: "pass" | "fail" }; warnings: { purity?: string; failedTest?: string } }): string | undefined =>
  p.value.result === "fail" ? "Recorded as Failed." : p.warnings.failedTest ?? p.warnings.purity;

// Signed upload link for a certificate PDF; the browser uploads straight to
// storage (server actions cap bodies at 1 MB), then submits the path.
export async function coaUploadAction(lotNumber: string): Promise<{ path: string; token: string } | { error: string }> {
  await requirePermission("lots.receive");
  const lot = String(lotNumber).trim().toUpperCase();
  if (!LOT_NUMBER_RE.test(lot)) return { error: "Enter the lot number first." };
  return createCoaUpload(lot);
}

export async function receiveLotAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("lots.receive");
  const slug = str(f, "slug"), variantId = str(f, "variantId");
  const { c, v } = await variantOf(slug, variantId);
  const p = parseReceive(receiveInput(f));
  if (!p.ok) return { fieldErrors: p.fieldErrors };
  const val = p.value;
  const editing = str(f, "lotId");
  // Editing a draft: what it was before, to spot changed counts. Certificates
  // are added/edited/deleted on their own rows, not touched here.
  const prev = editing ? await lotById(uuid(f, "lotId")) : null;
  if (editing && (!prev || prev.status !== "draft")) throw new Error(STALE);
  // An optional first certificate, only when receiving a new lot.
  const cert = str(f, "labId") && !editing ? parseCertificate(certInput(f), today(), await activeLabIds()) : null;
  if (cert && !cert.ok) return { fieldErrors: cert.fieldErrors };
  if (cert?.ok && !(await pdfOk(val.lotNumber, cert.value.coaPath))) return { fieldErrors: { coa: "The certificate didn't finish uploading — attach it again." } };
  let id: string;
  if (editing) {
    id = uuid(f, "lotId");
    const r = await updateDraftLot(id, val, owner.id);
    if (r.taken) return { fieldErrors: { lotNumber: "That lot number is already used." } };
    if (!r.ok) throw new Error(STALE);
  } else {
    const r = await receiveLot(slug, variantId, val, owner.id);
    if (!r.ok) return { fieldErrors: { lotNumber: "That lot number is already used." } };
    id = r.id;
  }
  if (cert?.ok) {
    const r = await addCertificate({ id, slug, variant_id: variantId }, cert.value, owner.id);
    if (!r.ok) { refresh(slug); return { error: `Saved ${val.lotNumber} as a draft, but that report number is already recorded for this lab — add the certificate from the lot.` }; }
  }
  // A new lot alerts on any discrepancy; an edited draft only when its counts
  // changed and still don't add up (not on every save).
  const countsChanged = !prev || prev.ordered_qty !== val.orderedQty || prev.counted_qty !== val.countedQty || prev.damaged_qty !== val.damagedQty;
  if (countsChanged && isDiscrepancy(val.orderedQty, val.countedQty, val.damagedQty)) {
    await alertOwner("A lot arrived short or damaged",
      `${c.name} ${v.strength}, lot ${val.lotNumber}: ordered ${val.orderedQty}, counted ${val.countedQty}, damaged ${val.damagedQty}. Note: ${val.discrepancyNote}`);
  }
  // Received from a wholesale run page: link the new draft to that run's line
  // (the lot goes live when the owner passes it there).
  const runLineId = str(f, "runLineId");
  if (runLineId && !editing) {
    await requirePermission("wholesale.manage");
    const line = await lineById(uuid(f, "runLineId"));
    if (!line || line.slug !== slug || line.variant_id !== variantId) throw new Error(STALE);
    if (!(await linkLot(line.id, id, owner.id))) return { error: `Saved ${val.lotNumber} as a draft, but the run's line changed — link it from the run page.` };
    try { await fillLotCostFromLine(id, line, await lotDefaults()); } catch (err) {
      await alertOwner("Lot cost not recorded", `${slug} ${variantId} lot ${val.lotNumber}: the run order's cost wasn't copied onto the lot. ${String(err)}`);
    }
    refresh(slug);
    revalidatePath(`/admin/wholesale/runs/${line.run_id}`);
    return { ok: `Saved ${val.lotNumber} and linked it to the run. Pass it there once the certificate checks out.` };
  }
  if (str(f, "intent") === "live") {
    const r = await putLotLive(id, owner.id);
    refresh(slug);
    if (r === "ok") return { ok: `${val.lotNumber} is live.` };
    if (LIVE_REFUSAL[r]) return { error: `Saved as a draft. ${LIVE_REFUSAL[r]}` };
    throw new Error(STALE);
  }
  refresh(slug);
  const warning = cert?.ok ? certWarning(cert) : undefined;
  return { ok: `Saved ${val.lotNumber} as a draft.`, ...(warning ? { warning } : {}) };
}

export async function putLiveAction(f: FormData): Promise<void> {
  const owner = await requirePermission("lots.put_live");
  const id = uuid(f, "lotId");
  const r = await putLotLive(id, owner.id);
  if (r !== "ok") throw new Error(LIVE_REFUSAL[r] ?? STALE);
  const lot = await lotById(id);
  refresh(lot?.slug ?? "");
}

export async function retireAction(f: FormData): Promise<void> {
  const owner = await requirePermission("lots.put_live");
  const id = uuid(f, "lotId");
  if ((await retireLot(id, owner.id)) !== "ok") throw new Error(STALE);
  const lot = await lotById(id);
  refresh(lot?.slug ?? "");
}

export async function correctCountAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("stock.correct");
  const id = uuid(f, "lotId");
  const p = parseCorrection({ direction: str(f, "direction"), vials: str(f, "vials"), reason: str(f, "reason"), note: str(f, "note") });
  if (!p.ok) return { fieldErrors: p.fieldErrors };
  if (p.value.reason === "owner_withdrawal" && !can(owner, "stock.owner_withdrawal")) return { error: "Only the owner can record an owner withdrawal." };
  const r = await correctCount(id, p.value.delta, p.value.reason, p.value.note, owner.id);
  if (r === "below_committed") return { fieldErrors: { vials: "That's more than are left — held and sold vials can't be removed." } };
  if (r !== "ok") throw new Error(STALE);
  const lot = await lotById(id);
  refresh(lot?.slug ?? "");
  const n = Math.abs(p.value.delta), vials = `${n} vial${n === 1 ? "" : "s"}`;
  return { ok: p.value.delta < 0 ? `Removed ${vials}.` : `Added ${vials}.` };
}

export async function saveCertificateAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("lots.receive");
  const lot = await lotById(uuid(f, "lotId"));
  if (!lot) throw new Error(STALE);
  const p = parseCertificate(certInput(f), today(), await activeLabIds());
  if (!p.ok) return { fieldErrors: p.fieldErrors };
  if (!(await pdfOk(lot.lot_number, p.value.coaPath))) return { fieldErrors: { coa: "The certificate didn't finish uploading — attach it again." } };
  const certId = str(f, "certId");
  const target = { id: lot.id, slug: lot.slug, variant_id: lot.variant_id };
  if (certId) {
    if (lot.status !== "draft") throw new Error(STALE);   // locked: add a re-test or a correction instead
    const r = await updateDraftCertificate(uuid(f, "certId"), target, p.value, owner.id);
    if (!r.ok && r.taken) return { fieldErrors: { reportNumber: TAKEN } };
    if (!r.ok) throw new Error(STALE);
  } else {
    const r = await addCertificate(target, p.value, owner.id);
    if (!r.ok) return { fieldErrors: { reportNumber: TAKEN } };
  }
  refresh(lot.slug);
  const warning = certWarning(p);
  return { ok: certId ? "Certificate saved." : "Certificate added.", ...(warning ? { warning } : {}) };
}

export async function deleteCertificateAction(f: FormData): Promise<void> {
  const owner = await requirePermission("lots.receive");
  const c = await certificateById(uuid(f, "certId"));
  if (!c || c.lot_status !== "draft") throw new Error(STALE);
  if (!(await deleteDraftCertificate(c.id, { id: c.lot_id, slug: c.slug, variant_id: c.variant_id }, c.report_number, owner.id)).ok) throw new Error(STALE);
  refresh(c.slug);
}

export async function correctCertificateAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("lots.receive");
  const c = await certificateById(uuid(f, "certId"));
  if (!c) throw new Error(STALE);
  const note = str(f, "correction").trim().slice(0, CORRECTION_MAX);
  if (!note) return { fieldErrors: { correction: "Say what was wrong and what's right." } };
  await addCorrection(c.id, { id: c.lot_id, slug: c.slug, variant_id: c.variant_id }, c.correction_note, note, owner.id);
  refresh(c.slug);
  return { ok: "Correction added. Customers see it on the certificate." };
}

const FIELDS = { price: "price_cents", low: "low_at", sku: "threepl_sku" } as const;
export async function setFieldAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("catalog.edit");
  const slug = str(f, "slug"), variantId = str(f, "variantId");
  await variantOf(slug, variantId);
  const field = str(f, "field") as keyof typeof FIELDS;
  if (!Object.hasOwn(FIELDS, field)) throw new Error("Unknown field.");
  const parsed = field === "price" ? parsePrice(str(f, "value")) : field === "low" ? parseLowAt(str(f, "value")) : parseSku(str(f, "value"));
  if (!parsed.ok) return { error: parsed.error };
  const r = await setVariantField(slug, variantId, FIELDS[field], parsed.value, owner.id);
  if (!r.ok && r.reason === "taken") return { error: "Another strength already uses that SKU." };
  if (!r.ok) throw new Error(PRODUCT_STALE);
  refresh(slug);
  return { ok: "Saved." };
}

export async function setShownAction(f: FormData): Promise<void> {
  const owner = await requirePermission("catalog.edit");
  const slug = str(f, "slug");
  productOf(slug);
  if (!(await setShown(slug, str(f, "shown") === "true", owner.id))) throw new Error(PRODUCT_STALE);
  refresh(slug);
}

// Offered (or not) as a 10-vial wholesale kit. Orders already placed keep their kits.
export async function setWholesaleAction(f: FormData): Promise<void> {
  const owner = await requirePermission("catalog.edit");
  const slug = str(f, "slug"), variantId = str(f, "variantId");
  await variantOf(slug, variantId);
  if (!(await setVariantWholesale(slug, variantId, str(f, "on") === "true", owner.id))) throw new Error(PRODUCT_STALE);
  refresh(slug);
}

// ---------- strengths ----------
export async function addStrengthAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("catalog.edit");
  const slug = str(f, "slug");
  productOf(slug);
  const e: Record<string, string> = {};
  const strength = parseStrength(str(f, "amount"), str(f, "unit"));
  if (!strength.ok) e.strength = strength.error;
  const price = parsePrice(str(f, "price"));
  if (!price.ok) e.price = price.error;
  const low = parseLowAt(str(f, "lowAt"));
  if (!low.ok) e.lowAt = low.error;
  const sku = parseSku(str(f, "sku"));
  if (!sku.ok) e.sku = sku.error;
  if (!strength.ok || !price.ok || !low.ok || !sku.ok) return { fieldErrors: e };
  const r = await addVariant(slug, { ...strength.value, priceCents: price.value, lowAt: low.value, sku: sku.value }, owner.id);
  if (!r.ok) {
    if (r.reason === "archived") return { fieldErrors: { strength: "That strength is archived — restore it instead." } };
    if (r.reason === "sku_taken") return { fieldErrors: { sku: "That SKU is already used." } };
    return { fieldErrors: { strength: "That strength already exists." } };
  }
  refresh(slug);
  return { ok: `Added ${strength.value.strength} — hidden until you show it.` };
}

const strengthTarget = (f: FormData) => {
  const slug = str(f, "slug");
  productOf(slug);
  return { slug, variantId: str(f, "variantId") };
};

export async function setStrengthShownAction(f: FormData): Promise<void> {
  const owner = await requirePermission("catalog.edit");
  const { slug, variantId } = strengthTarget(f);
  if (!(await setVariantShown(slug, variantId, str(f, "shown") === "true", owner.id)).ok) throw new Error(PRODUCT_STALE);
  refresh(slug);
}

export async function archiveStrengthAction(f: FormData): Promise<void> {
  const owner = await requirePermission("catalog.edit");
  const { slug, variantId } = strengthTarget(f);
  if (!(await archiveVariant(slug, variantId, owner.id)).ok) throw new Error(PRODUCT_STALE);
  refresh(slug);
}

export async function restoreStrengthAction(f: FormData): Promise<void> {
  const owner = await requirePermission("catalog.edit");
  const { slug, variantId } = strengthTarget(f);
  if (!(await restoreVariant(slug, variantId, owner.id)).ok) throw new Error(PRODUCT_STALE);
  refresh(slug);
}

export async function deleteStrengthAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("catalog.edit");
  const { slug, variantId } = strengthTarget(f);
  const r = await deleteVariant(slug, variantId, owner.id);
  if (r === "has_history") return { error: "This one has lots or orders, so archive it instead." };
  if (r !== "ok") throw new Error(PRODUCT_STALE);
  refresh(slug);
  return { ok: "Deleted." };
}
