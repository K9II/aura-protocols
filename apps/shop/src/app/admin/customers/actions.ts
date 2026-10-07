"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { adjustCredit, getCustomerBasics, logCustomerEvent } from "@/lib/customers/data";
import { blockCustomer, unblockCustomer } from "@/lib/customers/block";
import { blockRefusal, parseCredit } from "@/lib/customers/rules";
import { creditBalance } from "@/lib/partners/ledger";
import { sendOrAlert } from "@/lib/notify";
import { storeCreditAddedEmail } from "@/lib/emails";
import { usd } from "@/lib/html";
import { siteUrl } from "@/lib/supabase/env";
import { lastVerifySentAt, sendVerifyEmail } from "@/lib/account/verify";

export type ActionState = { ok?: string; error?: string; fieldErrors?: Record<string, string> } | null;

const STALE = "That customer changed or doesn't exist — reload the page.";
const RESEND_COOLDOWN_MS = 60 * 1000; // same as the gate (app/auth/gate-actions.ts)
const str = (f: FormData, k: string) => String(f.get(k) ?? "");

async function target(f: FormData) {
  const id = z.string().uuid().safeParse(f.get("customerId"));
  if (!id.success) throw new Error(STALE);
  const c = await getCustomerBasics(id.data);
  if (!c) throw new Error(STALE);
  return c;
}
// Disputes too: its chargeback pages show Block customer and the Blocked tag.
const refresh = (id: string) => { revalidatePath("/admin/customers"); revalidatePath(`/admin/customers/${id}`); revalidatePath("/admin/disputes", "layout"); };

export async function adjustCreditAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("credit.adjust");
  const c = await target(f);
  const balance = await creditBalance(c.id);
  const p = parseCredit({ direction: str(f, "direction"), amount: str(f, "amount"), category: str(f, "category"), note: str(f, "note"), email: str(f, "email"), message: str(f, "message") }, balance);
  if (!p.ok) return { fieldErrors: p.fieldErrors };
  const v = p.value;
  const r = await adjustCredit(c.id, v.amountCents, v.category, v.note, owner.id);
  if (!r.ok) return { fieldErrors: { amount: "The balance changed and is now too low — reload and try again." } };
  refresh(c.id);
  const amount = usd(Math.abs(v.amountCents));
  if (v.amountCents < 0) return { ok: `Removed ${amount}.` };
  if (!v.email) return { ok: `Added ${amount}.` };
  const sent = await sendOrAlert({ to: c.email, ...storeCreditAddedEmail(v.amountCents, balance + v.amountCents, v.message, siteUrl()) }, `Store credit added to ${c.email} by the owner (event ${r.eventId}).`);
  return { ok: sent ? `Added ${amount}. The customer was emailed.` : "Credit added. The email didn't send." };
}

export async function blockAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("customers.block");
  const c = await target(f);
  const reason = str(f, "reason").trim().slice(0, 500);
  if (!reason) return { fieldErrors: { reason: "Say why." } };
  const refusal = blockRefusal({ id: c.id, isOwner: c.isOwner }, owner.id);
  if (refusal) return { error: refusal };
  await blockCustomer(c.id, reason, owner.id); // throws (and alerts) on a failed step
  refresh(c.id);
  return { ok: "Blocked." };
}

export async function unblockAction(f: FormData): Promise<void> {
  const owner = await requirePermission("customers.block");
  const c = await target(f);
  if (!c.blockedAt) throw new Error(STALE);
  await unblockCustomer(c.id, owner.id);
  refresh(c.id);
}

export async function resendVerifyAdminAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const owner = await requirePermission("customers.resend_verify");
  const c = await target(f);
  if (c.verifiedAt) return { error: "Already verified." };
  const last = await lastVerifySentAt(c.id);
  if (last && Date.now() - Date.parse(last) < RESEND_COOLDOWN_MS) return { error: "One was just sent — wait a minute before sending another." };
  await sendVerifyEmail(c.id, c.email); // throws on failure → admin error page
  await logCustomerEvent({ customerId: c.id, kind: "verify_resent", actorId: owner.id });
  refresh(c.id);
  return { ok: "Sent." };
}
