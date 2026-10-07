"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { recordAdminEvent, type AdminAction } from "@/lib/audit/data";
import { getPartnerById, partnerEmail, setPartnerStatus, type PartnerStatus } from "@/lib/partners/data";
import { forfeitUnpaid } from "@/lib/partners/ledger";
import { partnerApprovedEmail, partnerDeclinedEmail } from "@/lib/emails-partners";
import { sendOrAlert } from "@/lib/notify";
import { siteUrl } from "@/lib/supabase/env";

const schema = z.object({ partnerId: z.string().uuid(), to: z.enum(["approved", "declined", "suspended"]) });
const ALLOWED: Record<PartnerStatus, PartnerStatus[]> = { applied: ["approved", "declined"], approved: ["suspended"], suspended: ["approved"], declined: [] };

export async function setPartnerStatusAction(form: FormData): Promise<void> {
  const owner = await requireOwner();
  const parsed = schema.safeParse({ partnerId: form.get("partnerId"), to: form.get("to") });
  if (!parsed.success) return;
  const { partnerId, to } = parsed.data;
  const partner = await getPartnerById(partnerId);
  if (!partner || !ALLOWED[partner.status].includes(to)) return;
  if (!(await setPartnerStatus(partnerId, partner.status, to))) return;
  const action: AdminAction = to === "approved" ? (partner.status === "suspended" ? "partner_reinstated" : "partner_approved") : to === "declined" ? "partner_declined" : "partner_suspended";
  await recordAdminEvent({ area: "partners", action, targetId: partnerId, label: partner.code, actorId: owner.id });
  if (to === "suspended") await forfeitUnpaid(partnerId);
  const email = await partnerEmail(partner.customer_id);
  if (email && to === "approved" && partner.status === "applied") {
    await sendOrAlert({ to: email, ...partnerApprovedEmail(partner.code, siteUrl()) }, `partner approved ${partner.code}`);
  }
  if (email && to === "declined") await sendOrAlert({ to: email, ...partnerDeclinedEmail() }, `partner declined ${partner.code}`);
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${partnerId}`);
}
