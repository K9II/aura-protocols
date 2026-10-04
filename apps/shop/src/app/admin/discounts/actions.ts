"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import {
  getCodeById, insertBatch, insertCode, isDiscountCodeTaken, resetUse, setCodeState, setDiscountCap, updateBatch, updateCode, type CodeInput,
} from "@/lib/discounts/data";
import { ADMIN_CODE_REASON, generateBatchCodes, MAX_BATCH_SIZE, normalizePrefix, validateAdminCode, type StoredStatus } from "@/lib/discounts/rules";
import { zonedToIso } from "@/lib/discounts/time";

export type SaveState = { fieldErrors?: Record<string, string>; error?: string } | null;

const on = (v: FormDataEntryValue | null) => v === "on";
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const scopeItems = z.array(z.object({ type: z.enum(["class", "product"]), value: z.string().max(100) })).max(50);

// Parses the shared create/edit/batch form into a row. Returns field errors
// the form shows next to each input.
function parseRule(f: FormData): { input: CodeInput } | { fieldErrors: Record<string, string> } {
  const e: Record<string, string> = {};
  const kind = str(f, "kind");
  if (!["item_pct", "order_pct", "order_amount", "ship_only"].includes(kind)) e.kind = "Pick a kind.";
  let value = 0;
  if (kind === "item_pct" || kind === "order_pct") {
    value = Number(str(f, "value"));
    if (!Number.isInteger(value) || value < 1 || value > 100) e.value = "Use a whole percent from 1 to 100.";
  } else if (kind === "order_amount") {
    const dollars = Number(str(f, "value"));
    value = Math.round(dollars * 100);
    if (!Number.isFinite(dollars) || value < 1) e.value = "Enter an amount of at least $0.01.";
  }
  const toIso = (k: "startsAt" | "endsAt") => {
    const v = str(f, k);
    if (!v) return null;
    try { return zonedToIso(v); } catch { e[k] = "Enter a date and time."; return null; }
  };
  const starts_at = toIso("startsAt");
  const ends_at = toIso("endsAt");
  if (ends_at && Date.parse(ends_at) <= Math.max(Date.now(), starts_at ? Date.parse(starts_at) : 0)) e.endsAt = "The end must be in the future and after the start.";
  const maxRaw = str(f, "maxUses");
  const max_uses = maxRaw ? Number(maxRaw) : null;
  if (max_uses != null && (!Number.isInteger(max_uses) || max_uses < 1)) e.maxUses = "Use a whole number, 1 or more — or leave empty for no limit.";
  const minRaw = str(f, "minOrder");
  const min_order_cents = minRaw ? Math.round(Number(minRaw) * 100) : null;
  if (min_order_cents != null && (!Number.isFinite(min_order_cents) || min_order_cents < 0)) e.minOrder = "Enter a dollar amount.";
  let locked_email: string | null = null;
  if (on(f.get("lockEmail"))) {
    const em = z.string().trim().toLowerCase().email().max(254).safeParse(str(f, "lockedEmail"));
    if (em.success) locked_email = em.data; else e.lockedEmail = "Enter the account's email.";
  }
  const scope = str(f, "scope");
  let items: z.infer<typeof scopeItems> = [];
  try { items = scopeItems.parse(JSON.parse(str(f, "scopeItems") || "[]")); } catch { e.scopeItems = "Couldn't read the product list."; }
  if (scope === "only" && items.length === 0) e.scopeItems = "Add at least one product or class.";
  const pick = (t: "class" | "product") => items.filter((i) => i.type === t).map((i) => i.value);
  const include = scope === "only", exclude = scope === "except";
  if (Object.keys(e).length) return { fieldErrors: e };
  return {
    input: {
      note: str(f, "note") || null, kind: kind as CodeInput["kind"], value,
      stack_on_top: (kind === "order_pct" || kind === "order_amount") && on(f.get("stackOnTop")),
      free_shipping: kind !== "ship_only" && on(f.get("freeShipping")),
      starts_at, ends_at, max_uses, once_per_customer: on(f.get("oncePerCustomer")), locked_email, min_order_cents,
      include_slugs: include ? pick("product") : [], exclude_slugs: exclude ? pick("product") : [],
      include_classes: include ? pick("class") : [], exclude_classes: exclude ? pick("class") : [],
      status: str(f, "intent") === "paused" ? "paused" : "active",
    },
  };
}

export async function saveCodeAction(_prev: SaveState, f: FormData): Promise<SaveState> {
  const owner = await requireOwner();
  const parsed = parseRule(f);
  if ("fieldErrors" in parsed) return parsed;
  const { input } = parsed;

  if (str(f, "mode") === "batch") {
    const prefix = normalizePrefix(str(f, "prefix"));
    const count = Number(str(f, "count"));
    if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH_SIZE) return { fieldErrors: { count: `Use 1 to ${MAX_BATCH_SIZE.toLocaleString("en-US")}.` } };
    const r = await insertBatch(prefix, generateBatchCodes(prefix, count), input, owner.id);
    if ("error" in r) return { error: "A generated code clashed with an existing one — try again." };
    revalidatePath("/admin/discounts");
    redirect(`/admin/discounts/batch/${r.id}?created=1`);
  }

  const id = str(f, "id");
  if (id) {
    const existing = await getCodeById(id);
    if (!existing) return { error: "That code no longer exists." };
    const { status: _ignored, ...patch } = input; // status changes go through Pause / Resume / End
    void _ignored;
    if (existing.batch_id) await updateBatch(existing.batch_id, patch, "Rule edited", owner.id);
    else await updateCode(id, patch, "Rule edited", owner.id);
    revalidatePath("/admin/discounts");
    redirect(existing.batch_id ? `/admin/discounts/batch/${existing.batch_id}` : `/admin/discounts/${id}`);
  }

  const check = validateAdminCode(str(f, "code"));
  if (!check.ok) return { fieldErrors: { code: ADMIN_CODE_REASON[check.reason] } };
  if (await isDiscountCodeTaken(check.code)) return { fieldErrors: { code: ADMIN_CODE_REASON.taken } };
  const r = await insertCode(check.code, input, owner.id);
  if ("error" in r) return { fieldErrors: { code: ADMIN_CODE_REASON.taken } };
  revalidatePath("/admin/discounts");
  redirect(`/admin/discounts/${r.id}`);
}

export async function codeAvailableAction(code: string): Promise<{ ok: boolean; message: string }> {
  await requireOwner();
  const check = validateAdminCode(String(code).slice(0, 40));
  if (!check.ok) return { ok: false, message: ADMIN_CODE_REASON[check.reason] };
  if (await isDiscountCodeTaken(check.code)) return { ok: false, message: ADMIN_CODE_REASON.taken };
  return { ok: true, message: `${check.code} is available` };
}

const MOVES: Record<StoredStatus, StoredStatus[]> = { active: ["paused", "ended"], paused: ["active", "ended"], ended: [] };
const stateSchema = z.object({
  codeId: z.string().uuid().optional(), batchId: z.string().uuid().optional(),
  from: z.enum(["active", "paused", "ended"]), to: z.enum(["active", "paused", "ended"]),
});

export async function setCodeStateAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const p = stateSchema.safeParse({ codeId: f.get("codeId") || undefined, batchId: f.get("batchId") || undefined, from: f.get("from"), to: f.get("to") });
  if (!p.success || !MOVES[p.data.from].includes(p.data.to) || (!p.data.codeId && !p.data.batchId)) return;
  const target = p.data.codeId ? { codeId: p.data.codeId } : { batchId: p.data.batchId! };
  await setCodeState(target, p.data.from, p.data.to, owner.id);
  revalidatePath("/admin/discounts", "layout");
}

export async function resetUseAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const id = z.string().uuid().safeParse(f.get("redemptionId"));
  if (!id.success) return;
  await resetUse(id.data, owner.id);
  revalidatePath("/admin/discounts", "layout");
}

export async function setCapAction(_prev: { ok?: true; error?: string } | null, f: FormData): Promise<{ ok?: true; error?: string }> {
  const owner = await requireOwner();
  const cap = Number(str(f, "cap"));
  if (!Number.isInteger(cap) || cap < 5 || cap > 60) return { error: "Use a whole percent from 5 to 60." };
  await setDiscountCap(cap, owner.id);
  revalidatePath("/admin/discounts", "layout");
  return { ok: true };
}
