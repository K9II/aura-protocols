"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { catalogChangedByOwner } from "@/lib/catalog-live";
import { labById, saveLab, setCoaSetting, setLabActive } from "@/lib/coa/data";
import { NOT_RECORDED_LAB, parseLab } from "@/lib/coa/rules";
import type { ActionState } from "@/app/admin/catalog/actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "");
// "/admin/catalog" layout covers /admin/catalog/settings and every product
// page, "/admin/wholesale/runs" every run page (Receive lot) — so a lab added
// from a certificate form shows up in its Lab list. Both pages read labs fresh.
const refresh = () => {
  catalogChangedByOwner();
  revalidatePath("/admin/catalog", "layout");
  revalidatePath("/admin/wholesale/runs", "layout");
};

export async function setCoaSettingAction(f: FormData): Promise<void> {
  await requirePermission("catalog.edit");
  const key = str(f, "key");
  if (key !== "showAll" && key !== "showMeasured") throw new Error("Unknown setting.");
  await setCoaSetting(key, str(f, "on") === "true");
  refresh();
}

// The placeholder lab holding certificates migrated from the old test lots:
// never editable or re-activatable from this page.
const NOT_RECORDED = "The placeholder lab for old test lots can't be changed here.";

export async function saveLabAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requirePermission("catalog.edit");
  const id = str(f, "labId") ? z.string().uuid().parse(str(f, "labId")) : null;
  if (id && (await labById(id))?.name === NOT_RECORDED_LAB) throw new Error(NOT_RECORDED);
  const p = parseLab({ name: str(f, "name"), city: str(f, "city"), verify: str(f, "verify"), iso: str(f, "iso"), hint: str(f, "hint") });
  if (!p.ok) return { fieldErrors: p.fieldErrors };
  const r = await saveLab(id, p.value);
  if (!r.ok) return { fieldErrors: { name: "A lab with that name already exists." } };
  refresh();
  return { ok: id ? "Lab saved." : "Lab added.", name: p.value.name };
}

export async function setLabActiveAction(f: FormData): Promise<void> {
  await requirePermission("catalog.edit");
  const id = z.string().uuid().parse(str(f, "labId"));
  if ((await labById(id))?.name === NOT_RECORDED_LAB) throw new Error(NOT_RECORDED);
  await setLabActive(id, str(f, "active") === "true");
  refresh();
}
