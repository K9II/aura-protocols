"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { markPayoutPaid } from "@/lib/partners/ledger";
import { getPartnerById, markW9Checked, partnerEmail, w9SignedUrl } from "@/lib/partners/data";
import { partnerCashPaidEmail } from "@/lib/emails-partners";
import { sendOrAlert } from "@/lib/notify";

const paidSchema = z.object({ payoutId: z.string().uuid(), reference: z.string().trim().min(2).max(80) });
const partnerSchema = z.object({ partnerId: z.string().uuid() });

export async function markPayoutPaidAction(form: FormData): Promise<void> {
  await requireOwner();
  const parsed = paidSchema.safeParse({ payoutId: form.get("payoutId"), reference: form.get("reference") });
  if (!parsed.success) return;
  const payout = await markPayoutPaid(parsed.data.payoutId, parsed.data.reference);
  if (payout?.partners) {
    const to = await partnerEmail(payout.partners.customer_id);
    if (to) await sendOrAlert({ to, ...partnerCashPaidEmail({ cashCents: payout.cash_cents, reference: parsed.data.reference }) }, `payout ${payout.partners.code}`);
  }
  revalidatePath("/admin/payouts");
}

export async function openW9Action(form: FormData): Promise<void> {
  await requireOwner();
  const parsed = partnerSchema.safeParse({ partnerId: form.get("partnerId") });
  if (!parsed.success) return;
  const partner = await getPartnerById(parsed.data.partnerId);
  if (!partner?.w9_path) return;
  redirect(await w9SignedUrl(partner.w9_path));
}

export async function markW9CheckedAction(form: FormData): Promise<void> {
  await requireOwner();
  const parsed = partnerSchema.safeParse({ partnerId: form.get("partnerId") });
  if (!parsed.success) return;
  await markW9Checked(parsed.data.partnerId);
  revalidatePath("/admin/payouts");
}
