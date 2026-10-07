"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { logAdminEvent, recordAdminEvent } from "@/lib/audit/data";
import { usd } from "@/lib/html";
import { markPayoutPaid } from "@/lib/partners/ledger";
import { getPartnerById, markW9Checked, partnerEmail, w9SignedUrl } from "@/lib/partners/data";
import { partnerCashPaidEmail } from "@/lib/emails-partners";
import { sendOrAlert } from "@/lib/notify";

const paidSchema = z.object({ payoutId: z.string().uuid(), reference: z.string().trim().min(2).max(80) });
const partnerSchema = z.object({ partnerId: z.string().uuid() });

export async function markPayoutPaidAction(form: FormData): Promise<void> {
  const owner = await requirePermission("payouts.mark_paid");
  const parsed = paidSchema.safeParse({ payoutId: form.get("payoutId"), reference: form.get("reference") });
  if (!parsed.success) return;
  const payout = await markPayoutPaid(parsed.data.payoutId, parsed.data.reference);
  if (payout) await recordAdminEvent({ area: "payouts", action: "payout_paid", targetId: payout.id, label: payout.partners?.code ?? null, detail: `${usd(payout.cash_cents)} · ref ${parsed.data.reference}`, actorId: owner.id });
  if (payout?.partners) {
    const to = await partnerEmail(payout.partners.customer_id);
    if (to) await sendOrAlert({ to, ...partnerCashPaidEmail({ cashCents: payout.cash_cents, reference: parsed.data.reference }) }, `payout ${payout.partners.code}`);
  }
  revalidatePath("/admin/payouts");
  revalidatePath("/admin/partners/[id]", "page");
}

export async function openW9Action(form: FormData): Promise<void> {
  const owner = await requirePermission("w9.open");
  const parsed = partnerSchema.safeParse({ partnerId: form.get("partnerId") });
  if (!parsed.success) return;
  const partner = await getPartnerById(parsed.data.partnerId);
  if (!partner?.w9_path) return;
  // A tax-ID document: no record, no access (this throws if the log fails).
  await logAdminEvent({ area: "payouts", action: "w9_opened", targetId: partner.id, label: partner.code, actorId: owner.id });
  redirect(await w9SignedUrl(partner.w9_path));
}

export async function markW9CheckedAction(form: FormData): Promise<void> {
  const owner = await requirePermission("w9.open");
  const parsed = partnerSchema.safeParse({ partnerId: form.get("partnerId") });
  if (!parsed.success) return;
  await markW9Checked(parsed.data.partnerId);
  const partner = await getPartnerById(parsed.data.partnerId);
  await recordAdminEvent({ area: "payouts", action: "w9_checked", targetId: parsed.data.partnerId, label: partner?.code ?? null, actorId: owner.id });
  revalidatePath("/admin/payouts");
  revalidatePath("/admin/partners/[id]", "page");
}
