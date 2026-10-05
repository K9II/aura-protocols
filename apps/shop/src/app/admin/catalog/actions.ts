"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { catalogContent } from "@/data/catalog";
import {
  coaUploaded, correctCount, createCoaUpload, lotById, putLotLive, receiveLot, replaceCertificate, retireLot,
  setShown, setVariantField, updateDraftLot,
} from "@/lib/catalog-ops/data";
import { isCoaPathFor, isDiscrepancy, LOT_NUMBER_RE, parseCorrection, parseLowAt, parsePrice, parseReceive, parseSku } from "@/lib/catalog-ops/rules";
import { catalogChangedByOwner } from "@/lib/catalog-live";
import { alertOwner } from "@/lib/notify";

export type ActionState = { ok?: string; error?: string; warning?: string; fieldErrors?: Record<string, string> } | null;

const STALE = "That lot changed — reload the page.";
const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const today = () => new Date().toISOString().slice(0, 10);
const uuid = (f: FormData, k: string) => { const r = z.string().uuid().safeParse(f.get(k)); if (!r.success) throw new Error(STALE); return r.data; };
const variantOf = (slug: string, variantId: string) => {
  const c = catalogContent.find((x) => x.slug === slug);
  const v = c?.variants.find((x) => x.id === variantId);
  if (!c || !v) throw new Error("That product changed — reload the page.");
  return { c, v };
};
const refresh = (slug: string) => { catalogChangedByOwner(); revalidatePath("/admin/catalog"); revalidatePath(`/admin/catalog/${slug}`); };
const receiveInput = (f: FormData) => ({
  lotNumber: str(f, "lotNumber"), purity: str(f, "purity"), method: str(f, "method"), testedOn: str(f, "testedOn"),
  ordered: str(f, "ordered"), counted: str(f, "counted"), damaged: str(f, "damaged"), note: str(f, "note"), coaPath: str(f, "coaPath"),
});
const LIVE_REFUSAL: Record<string, string> = {
  no_certificate: "Attach the certificate first.",
  nothing_sellable: "Nothing to sell — every vial is damaged.",
};

// Signed upload link for a certificate PDF; the browser uploads straight to
// storage (server actions cap bodies at 1 MB), then submits the path.
export async function coaUploadAction(lotNumber: string): Promise<{ path: string; token: string } | { error: string }> {
  await requireOwner();
  const lot = String(lotNumber).trim().toUpperCase();
  if (!LOT_NUMBER_RE.test(lot)) return { error: "Enter the lot number first." };
  return createCoaUpload(lot);
}

export async function receiveLotAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requireOwner();
  const slug = str(f, "slug"), variantId = str(f, "variantId");
  const { c, v } = variantOf(slug, variantId);
  const p = parseReceive(receiveInput(f), today());
  if (!p.ok) return { fieldErrors: p.fieldErrors };
  const val = p.value;
  if (val.coaPath && !(isCoaPathFor(val.lotNumber, val.coaPath) && await coaUploaded(val.coaPath))) {
    return { fieldErrors: { coa: "The certificate didn't finish uploading — attach it again." } };
  }
  const editing = str(f, "lotId");
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
  if (isDiscrepancy(val.orderedQty, val.countedQty, val.damagedQty)) {
    await alertOwner(`Lot ${val.lotNumber} arrived short or damaged`,
      `${c.name} ${v.strength}, lot ${val.lotNumber}: ordered ${val.orderedQty}, counted ${val.countedQty}, damaged ${val.damagedQty}. Note: ${val.discrepancyNote}`);
  }
  if (str(f, "intent") === "live") {
    const r = await putLotLive(id, owner.id);
    refresh(slug);
    if (r === "ok") return { ok: `${val.lotNumber} is live.` };
    if (LIVE_REFUSAL[r]) return { error: `Saved as a draft. ${LIVE_REFUSAL[r]}` };
    throw new Error(STALE);
  }
  refresh(slug);
  return { ok: `Saved ${val.lotNumber} as a draft.`, ...(p.warnings.purity ? { warning: p.warnings.purity } : {}) };
}

export async function putLiveAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = uuid(f, "lotId");
  const r = await putLotLive(id, owner.id);
  if (r !== "ok") throw new Error(LIVE_REFUSAL[r] ?? STALE);
  const lot = await lotById(id);
  refresh(lot?.slug ?? "");
}

export async function retireAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = uuid(f, "lotId");
  if ((await retireLot(id, owner.id)) !== "ok") throw new Error(STALE);
  const lot = await lotById(id);
  refresh(lot?.slug ?? "");
}

export async function correctCountAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requireOwner();
  const id = uuid(f, "lotId");
  const p = parseCorrection({ direction: str(f, "direction"), vials: str(f, "vials"), reason: str(f, "reason"), note: str(f, "note") });
  if (!p.ok) return { fieldErrors: p.fieldErrors };
  const r = await correctCount(id, p.value.delta, p.value.reason, p.value.note, owner.id);
  if (r === "below_committed") return { fieldErrors: { vials: "That's more than are left — held and sold vials can't be removed." } };
  if (r !== "ok") throw new Error(STALE);
  const lot = await lotById(id);
  refresh(lot?.slug ?? "");
  return { ok: p.value.delta < 0 ? `Removed ${-p.value.delta} vials.` : `Added ${p.value.delta} vials.` };
}

export async function replaceCertificateAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requireOwner();
  const id = uuid(f, "lotId");
  const lot = await lotById(id);
  if (!lot) throw new Error(STALE);
  const path = str(f, "coaPath");
  if (!isCoaPathFor(lot.lot_number, path) || !(await coaUploaded(path))) return { fieldErrors: { coa: "The certificate didn't finish uploading — attach it again." } };
  if (!(await replaceCertificate(id, path, owner.id))) throw new Error(STALE);
  refresh(lot.slug);
  return { ok: "Certificate replaced. The old file stays in the log." };
}

const FIELDS = { price: "price_cents", low: "low_at", sku: "threepl_sku" } as const;
export async function setFieldAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requireOwner();
  const slug = str(f, "slug"), variantId = str(f, "variantId");
  variantOf(slug, variantId);
  const field = str(f, "field") as keyof typeof FIELDS;
  if (!Object.hasOwn(FIELDS, field)) throw new Error("Unknown field.");
  const parsed = field === "price" ? parsePrice(str(f, "value")) : field === "low" ? parseLowAt(str(f, "value")) : parseSku(str(f, "value"));
  if (!parsed.ok) return { error: parsed.error };
  const r = await setVariantField(slug, variantId, FIELDS[field], parsed.value, owner.id);
  if (!r.ok && r.reason === "taken") return { error: "Another strength already uses that SKU." };
  if (!r.ok) throw new Error("That product changed — reload the page.");
  refresh(slug);
  return { ok: "Saved." };
}

export async function setShownAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const slug = str(f, "slug");
  if (!catalogContent.some((c) => c.slug === slug)) throw new Error("That product changed — reload the page.");
  if (!(await setShown(slug, str(f, "shown") === "true", owner.id))) throw new Error("That product changed — reload the page.");
  refresh(slug);
}
