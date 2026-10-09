"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { alertOwner, sendOrAlert } from "@/lib/notify";
import { catalogStockChanged } from "@/lib/catalog-live";
import { catalogContent } from "@/data/catalog";
import { getOrderById, stampWholesaleCancel, transitionOrder } from "@/lib/orders";
import { refundCard } from "@/lib/refunds/stripe";
import { REFUND_REASONS, stripeNoAnswer, type RefundReason } from "@/lib/refunds/rules";
import { wholesaleCancelledEmail } from "@/lib/emails";
import { lotById, variantRow } from "@/lib/catalog-ops/data";
import { currentMs } from "@/lib/clock";
import { localDate } from "@/lib/today/time";
import { kitsByStrength, strengthKey, suppliersOk } from "@/lib/wholesale/runs";
import {
  draftLotsFor, failLine, fillLotCostFromLine, getRun, lineById, linkLot, logEvent, passLine, recordLineOrder, resourceLine, runByCutoff, runLines, runOrders, saveRunNotes,
} from "@/lib/wholesale/runs-data";
import { afterLineFailed, releaseReadyOrders } from "@/lib/wholesale/balance";
import { parseSettingsForm } from "@/lib/wholesale/rules";
import { saveWholesaleSettings } from "@/lib/wholesale/data";

// Admin → Wholesale (spec 2026-10-08-wholesale-kits-design.md, Part 2). Every
// action asks for wholesale.manage first (owner only).
export type ActionState = { ok?: string; error?: string; fieldErrors?: Record<string, string> } | null;

const STALE = "That run changed — reload the page.";
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const uuid = (f: FormData, k: string) => { const r = z.string().uuid().safeParse(f.get(k)); return r.success ? r.data : null; };
const refresh = (runId: string) => { revalidatePath("/admin/wholesale"); revalidatePath(`/admin/wholesale/runs/${runId}`); revalidatePath("/admin"); };
const stripeMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
const PASS_REFUSAL: Record<string, string> = {
  no_certificate: "Add the lot's certificate first (Catalog → the strength → the lot).",
  nothing_sellable: "That lot has no sellable vials.",
  not_draft: "That lot is already live or retired.",
  not_pending: "That strength already has a result.",
  no_lot: "Link the received lot first.",
  missing: STALE,
};

export async function recordLineOrderAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("wholesale.manage");
  const runId = uuid(f, "runId");
  const run = runId ? await getRun(runId) : null;
  if (!run) return { error: STALE };
  const slug = str(f, "slug"), variantId = str(f, "variantId");
  if (!catalogContent.some((c) => c.slug === slug) || !(await variantRow(slug, variantId))) return { error: STALE };
  const supplier = str(f, "supplier").slice(0, 80);
  const extra = Number(str(f, "extraBoxes") || "0");
  const cost = Number(str(f, "cost").replace(/[$,]/g, ""));
  const ref = str(f, "ref").slice(0, 120) || null;
  const e: Record<string, string> = {};
  if (!supplier) e.supplier = "Name the supplier.";
  if (!Number.isInteger(extra) || extra < 0 || extra > 500) e.extraBoxes = "0 to 500 boxes.";
  if (!str(f, "cost") || !Number.isFinite(cost) || cost < 0) e.cost = "Enter the cost in dollars.";
  if (Object.keys(e).length) return { fieldErrors: e };
  const [lines, orders] = await Promise.all([runLines(run.id), runOrders([run.cutoff_on])]);
  const existing = lines.find((l) => l.slug === slug && l.variant_id === variantId);
  if (existing && existing.result !== "pending") return { error: "That strength already has a result." };
  if (existing?.lot_id) return { error: "A lot is already linked — re-source it first." };
  if (!suppliersOk(lines, supplier, existing?.id ?? "")) return { fieldErrors: { supplier: "A run uses at most 2 suppliers." } };
  const kits = kitsByStrength(orders).get(strengthKey(slug, variantId)) ?? 0;
  await recordLineOrder({ runId: run.id, slug, variantId, kits, extraBoxes: extra, supplier, costCents: Math.round(cost * 100), ref }, owner.id);
  refresh(run.id);
  return { ok: "Order recorded." };
}

export async function linkLotAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("wholesale.manage");
  const lineId = uuid(f, "lineId"), lotId = uuid(f, "lotId");
  const line = lineId ? await lineById(lineId) : null;
  if (!line) return { error: STALE };
  if (!lotId) return { fieldErrors: { lotId: "Pick the received lot." } };
  const lots = await draftLotsFor(line.slug, line.variant_id);
  if (!lots.some((l) => l.id === lotId)) return { fieldErrors: { lotId: "That lot isn't a draft lot of this strength (or it's linked to another run)." } };
  if (!(await linkLot(line.id, lotId, owner.id))) return { error: "That line changed — reload the page." };
  // Profit needs the lot's cost; a failure here doesn't undo the link.
  try { await fillLotCostFromLine(lotId, line); } catch (err) {
    await alertOwner("Lot cost not recorded", `${line.slug} ${line.variant_id} lot ${lotId}: the run order's cost wasn't copied onto the lot. Enter it on the lot (Catalog → Edit). ${String(err)}`);
  }
  refresh(line.run_id);
  return { ok: "Lot linked. Add its certificate, then Pass or Fail." };
}

export async function passLineAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("wholesale.manage");
  const lineId = uuid(f, "lineId");
  const line = lineId ? await lineById(lineId) : null;
  if (!line || !line.lot_id) return { error: STALE };
  const run = await getRun(line.run_id);
  if (!run) return { error: STALE };
  const r = await passLine(line.id, owner.id);
  if (!r.ok) return { error: PASS_REFUSAL[r.reason] ?? STALE };
  catalogStockChanged();
  if (r.short.length) {
    const lot = await lotById(line.lot_id);
    await alertOwner("Wholesale lot short", `${lot?.lot_number ?? line.lot_id} · ${run.number}: not enough vials to hold ${r.short.join(", ")}. Correct the count or re-source.`);
  }
  let moved: string[] = [];
  try {
    moved = await releaseReadyOrders(run);
  } catch (err) {
    await alertOwner("Wholesale balances not requested", `${run.number}: ${String(err)}`);
  }
  refresh(run.id);
  return { ok: `Passed — held for ${r.held} order line${r.held === 1 ? "" : "s"}${moved.length ? `; ${moved.length === 1 ? "1 order now owes" : `${moved.length} orders now owe`} the balance` : ""}.` };
}

export async function failLineAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("wholesale.manage");
  const lineId = uuid(f, "lineId");
  const note = str(f, "note").slice(0, 2000);
  if (!note) return { fieldErrors: { note: "Say what failed — this is the factory claim note." } };
  const line = lineId ? await lineById(lineId) : null;
  if (!line) return { error: STALE };
  const runId = await failLine(line.id, note, owner.id);
  if (!runId) return { error: STALE };
  const [run, variant] = await Promise.all([getRun(runId), variantRow(line.slug, line.variant_id)]);
  const c = catalogContent.find((x) => x.slug === line.slug);
  let n = 0;
  if (run && c) {
    try {
      n = await afterLineFailed(run, { id: line.id, slug: line.slug, variant_id: line.variant_id, strength: variant?.strength ?? line.variant_id, name: c.name });
    } catch (err) {
      await alertOwner("Wholesale lot-failed emails not sent", `${run.number}: ${String(err)}`);
    }
  }
  refresh(runId);
  return { ok: `Marked failed — ${n} buyer${n === 1 ? "" : "s"} emailed.` };
}

export async function resourceLineAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("wholesale.manage");
  const lineId = uuid(f, "lineId");
  const line = lineId ? await lineById(lineId) : null;
  if (!line || !(await resourceLine(line.id, owner.id))) return { error: STALE };
  refresh(line.run_id);
  return { ok: "Back to To order — record the new supplier order." };
}

export async function saveRunNotesAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requirePermission("wholesale.manage");
  const runId = uuid(f, "runId");
  const run = runId ? await getRun(runId) : null;
  if (!run) return { error: STALE };
  const notes = str(f, "notes");
  if (notes.length > 4000) return { fieldErrors: { notes: "Keep notes under 4,000 characters." } };
  await saveRunNotes(run.id, notes);
  refresh(run.id);
  return { ok: "Notes saved." };
}

// The owner cancels a deposit-paid order (failed lot, buyer asked, or the
// owner's choice) and refunds the deposit to the card. Same race handling as
// the buyer's own cancel: the charge.refunded webhook may move it first.
export async function cancelDepositAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("wholesale.manage");
  const orderId = uuid(f, "orderId");
  const order = orderId ? await getOrderById(orderId) : null;
  if (!order || order.channel !== "wholesale") return { error: STALE };
  if (order.status === "refunded") return { ok: "Already cancelled." };
  if (order.status !== "deposit_paid") return { error: `${order.order_number} isn't waiting in production any more — reload the page.` };
  const reasonRaw = str(f, "reason");
  const reason = (REFUND_REASONS as readonly string[]).includes(reasonRaw) ? (reasonRaw as RefundReason) : null;
  if (!reason) return { fieldErrors: { reason: "Pick a reason." } };
  const note = str(f, "note").slice(0, 300) || null;
  if (!order.deposit_payment_intent || !order.deposit_cents) {
    return { error: `${order.order_number} has no deposit payment on record — refund it in Stripe.` };
  }
  let refundId: string;
  try {
    refundId = await refundCard(order.deposit_payment_intent, order.deposit_cents, `order-refund-${order.id}-deposit`);
  } catch (err) {
    if (stripeNoAnswer(err)) {
      await alertOwner("Refund needs a look", `${order.order_number}: Stripe didn't answer the deposit refund — check it in Stripe. ${stripeMessage(err)}`);
      return { error: "Stripe didn't answer — the refund may have gone through. Check the order in Stripe before trying again." };
    }
    return { error: `Stripe didn't refund ${order.order_number}: ${stripeMessage(err)}. Nothing changed here.` };
  }
  const moved = await transitionOrder(order.id, "deposit_paid", "refunded", {
    refund_destination: "card", refund_reason: reason, refund_note: note, refunded_by: owner.id, stripe_refund_id: refundId,
  }).catch(() => false);
  if (!moved) {
    const now = await getOrderById(order.id);
    if (now?.status !== "refunded") {
      await alertOwner("Wholesale deposit refunded but order not updated", `${order.order_number}: Stripe refund ${refundId} succeeded; the order is still ${now?.status ?? "unknown"}. Mark it refunded by hand.`);
      return { error: `${order.order_number} was refunded in Stripe but not updated here. You've been alerted.` };
    }
    if (!now.stripe_refund_id) {
      try { await stampWholesaleCancel(order.id, refundId); } catch (err) { await alertOwner("Wholesale cancel details not saved", `${order.order_number}: ${String(err)}`); }
    }
  }
  await sendOrAlert({ to: order.email, ...wholesaleCancelledEmail(order) }, `wholesale cancelled ${order.order_number}`);
  catalogStockChanged();   // any vials held for a passed strength go back to retail
  if (order.wholesale_cutoff_on) {
    try {
      const r = await runByCutoff(order.wholesale_cutoff_on);
      if (r) {
        await logEvent({ runId: r.id, kind: "order_cancelled", orderId: order.id, detail: `${order.order_number} · ${reason}${note ? ` · ${note}` : ""}`, actorId: owner.id });
        refresh(r.id);
      }
    } catch (err) {
      console.error("run event log failed:", err);   // the refund and the email already went; the log is a nicety
    }
  }
  revalidatePath(`/admin/orders/${order.order_number}`);
  return { ok: `${order.order_number} cancelled — deposit refunded.` };
}

export async function saveWholesaleSettingsAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requirePermission("wholesale.manage");
  const parsed = parseSettingsForm((k) => { const v = f.get(k); return typeof v === "string" ? v : null; }, localDate(currentMs()));
  if (!parsed.ok) return { fieldErrors: parsed.errors };
  await saveWholesaleSettings(parsed.value);
  revalidatePath("/wholesale");
  revalidatePath("/admin/wholesale");
  revalidatePath("/admin/wholesale/settings");
  return { ok: "Settings saved." };
}
