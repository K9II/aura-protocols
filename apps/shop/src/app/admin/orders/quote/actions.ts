"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getOrderById, transitionOrder } from "@/lib/orders";
import { getCustomerDetail } from "@/lib/customers/data";
import { getLiveCatalog } from "@/lib/catalog-live";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { kitRows } from "@/lib/wholesale/rules";
import { cardAllowed, parseQuoteForm, parseTransferForm, priceQuote, quoteCutoffChoices } from "@/lib/wholesale/quote";
import { createQuoteOrder, getBankDetails, recordBankTransfer } from "@/lib/wholesale/quote-data";
import { recordAdminEvent } from "@/lib/audit/data";
import { replyBlockedMessage, replyViolation } from "@/lib/inquiries/checks";
import { quoteOrderReadyEmail } from "@/lib/emails";
import { sendOrAlert } from "@/lib/notify";
import { siteUrl } from "@/lib/supabase/env";
import { currentMs } from "@/lib/clock";
import { localDate } from "@/lib/today/time";
import { usd } from "@/lib/html";

// Wholesale quote orders (mocks 2026-10-17). Owner only: wholesale.quote.
export type QuoteActionState = { ok?: string; error?: string; fieldErrors?: Record<string, string> } | null;

const getter = (f: FormData) => (k: string) => { const v = f.get(k); return typeof v === "string" ? v : null; };
const uuid = (v: FormDataEntryValue | null) => { const r = z.string().uuid().safeParse(v); return r.success ? r.data : null; };

export async function createQuoteOrderAction(_prev: QuoteActionState, f: FormData): Promise<QuoteActionState> {
  const owner = await requirePermission("wholesale.quote");
  const today = localDate(currentMs());
  let settings, bank, rows;
  try {
    [settings, bank, rows] = await Promise.all([getWholesaleSettings(), getBankDetails(), getLiveCatalog().then((c) => kitRows(c.shown))]);
  } catch (err) {
    console.error("quote order setup read failed:", err);
    return { error: "Couldn't read the wholesale settings or catalog — nothing was created. Try again." };
  }
  const parsed = parseQuoteForm(getter(f), today, { bankReady: !!bank, cutoffs: quoteCutoffChoices(today, settings).map((c) => c.cutoffOn) });
  if (!parsed.ok) return { fieldErrors: parsed.errors, error: "Fix the marked fields — nothing was created." };
  const v = parsed.value;

  const who = await getCustomerDetail(v.customerId);
  if (!who) return { error: "That customer couldn't be found — reload the page." };
  if (who.blockedAt) return { error: `${who.fullName}'s account is blocked.` };
  if (!who.wholesale.enabledAt || who.wholesale.disabledAt) return { error: `Wholesale isn't on for ${who.fullName}. Turn it on from their customer page first.` };

  const price = priceQuote(v.lines, rows, { depositPct: v.depositPct, tiers: settings.tiers });
  if (price.missing.length) return { error: "A strength on this quote isn't on the store or has Wholesale switched off (Catalog). Remove it or switch it on." };
  if (v.payCard && !cardAllowed(price.items)) return { fieldErrors: { pay: "This order has an incretin or amylin analog, so card can't be offered. Use bank transfer." }, error: "Fix the marked fields — nothing was created." };
  if (v.note) {
    const hit = replyViolation(v.note, [who.fullName, who.email]);
    if (hit) return { fieldErrors: { note: replyBlockedMessage(hit.phrase) }, error: "Fix the marked fields — nothing was created." };
  }
  // One open quote order per inquiry: a second submit opens the first.
  if (v.inquiryId) {
    const { data } = await getSupabaseAdminClient().from("orders").select("order_number").eq("quote_inquiry_id", v.inquiryId).eq("status", "quoted").limit(1);
    const existing = (data as Array<{ order_number: string }> | null)?.[0]?.order_number;
    if (existing) redirect(`/admin/orders/${existing}`);
  }

  let order: { id: string; orderNumber: string };
  try {
    order = await createQuoteOrder({
      customerId: who.id, email: who.email, price, cutoffOn: v.cutoffOn, depositPct: v.depositPct, validUntil: v.validUntil,
      payBank: v.payBank, payCard: v.payCard, note: v.note, inquiryId: v.inquiryId, kitBoxCents: settings.kitBoxCents, actorId: owner.id,
    });
  } catch (err) {
    console.error("quote order create failed:", err);
    return { error: "The order couldn't be saved — nothing was created or emailed. Try again." };
  }
  const full = await getOrderById(order.id);
  const emailed = full ? await sendOrAlert({ to: who.email, ...quoteOrderReadyEmail(full, { siteUrl: siteUrl(), validUntil: v.validUntil, note: v.note }) }, `quote order ${order.orderNumber}`) : false;
  await recordAdminEvent({
    area: "orders", action: "quote_order_created", targetId: order.id, label: order.orderNumber, actorId: owner.id,
    detail: `${price.kits} kits · ${usd(price.totalBeforeTaxCents)} before tax · email: ${emailed ? "sent" : "failed"}`,
  });
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inquiries", "layout");
  redirect(`/admin/orders/${order.orderNumber}`);
}

export async function recordBankTransferAction(_prev: QuoteActionState, f: FormData): Promise<QuoteActionState> {
  const owner = await requirePermission("wholesale.quote");
  const id = uuid(f.get("orderId"));
  const order = id ? await getOrderById(id) : null;
  if (!order || order.channel !== "wholesale" || !order.quote_pay_bank) return { error: "That order changed — reload the page." };
  const parsed = parseTransferForm(getter(f), localDate(currentMs()));
  if (!parsed.ok) return { fieldErrors: parsed.errors };
  const t = parsed.value;
  if (t.payment === "deposit" && order.status !== "quoted") return { error: `${order.order_number} isn't waiting for its deposit — reload the page.` };
  if (t.payment === "balance" && order.status !== "balance_due") return { error: `${order.order_number} has no balance due — reload the page.` };
  if (t.payment === "deposit" && !order.ruo_confirmed_at) return { error: "The customer hasn't added their shipping address and research-use confirmation yet. Ask them to finish their order page, then record the transfer." };
  const due = (t.payment === "deposit" ? order.deposit_cents : order.balance_cents) ?? 0;
  if (t.amountCents < due) return { fieldErrors: { amount: `That's ${usd(due - t.amountCents)} less than the ${t.payment} of ${usd(due)}. Record it once the full amount has arrived.` } };
  let r: "moved" | "stale";
  try {
    r = await recordBankTransfer(order, t, owner.id);
  } catch (err) {
    console.error("bank transfer record failed:", err);
    return { error: `Couldn't record the transfer: ${String(err)}. Nothing changed.` };
  }
  if (r === "stale") return { error: `${order.order_number} changed — reload the page.` };
  const extra = t.amountCents > due ? ` · ${usd(t.amountCents - due)} more than due` : "";
  await recordAdminEvent({
    area: "orders", action: "bank_transfer_recorded", targetId: order.id, label: order.order_number, actorId: owner.id,
    detail: `${t.payment} · ${usd(t.amountCents)} · arrived ${t.receivedOn}${t.reference ? ` · ref ${t.reference}` : ""}${extra}`,
  });
  revalidatePath(`/admin/orders/${order.order_number}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/wholesale", "layout");
  return { ok: t.payment === "deposit" ? `Deposit recorded. ${order.order_number} joined its run and the customer was emailed.` : `Balance recorded. ${order.order_number} is ready to ship.` };
}

export async function cancelQuoteOrderAction(f: FormData): Promise<void> {
  const owner = await requirePermission("wholesale.quote");
  const id = uuid(f.get("orderId"));
  const order = id ? await getOrderById(id) : null;
  if (!order || order.status !== "quoted") throw new Error("That order isn't waiting for its deposit any more — reload the page.");
  if (await transitionOrder(order.id, "quoted", "cancelled")) {
    await recordAdminEvent({ area: "orders", action: "quote_order_cancelled", targetId: order.id, label: order.order_number, actorId: owner.id, detail: "before the deposit · nothing was paid" });
  }
  revalidatePath(`/admin/orders/${order.order_number}`);
  revalidatePath("/admin/orders");
}
