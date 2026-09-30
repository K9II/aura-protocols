"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCustomer } from "@/lib/dal";
import { createApplication, isCodeTaken, issueCode } from "@/lib/partners/data";
import { AUDIENCE_SIZE_IDS, CODE_REASON_TEXT, PARTNER_AGREEMENT_VERSION, PARTNER_TYPE_IDS, PARTNER_TYPES, PUBLISH_CHANNELS, validateCode, type PartnerApplication } from "@/lib/partners/codes";
import { hashIp } from "@/lib/gate";
import { alertAddress, sendOrAlert } from "@/lib/notify";
import { partnerApplicationOwnerEmail } from "@/lib/emails-partners";

export type ApplyState = { error?: string } | undefined;

const applySchema = z.object({
  partnerType: z.enum(PARTNER_TYPE_IDS),
  audienceSize: z.enum(AUDIENCE_SIZE_IDS),
  promotion: z.string().trim().min(3).max(1000),
  agree: z.literal("on"),
});

// "Where you publish": ticked channels need a handle/link; Other needs a description; at least one.
function readChannels(form: FormData): Pick<PartnerApplication, "channels" | "other"> | null {
  const channels: PartnerApplication["channels"] = {};
  for (const c of PUBLISH_CHANNELS) {
    if (form.get(`ch_${c.id}`) !== "on") continue;
    const handle = String(form.get(`h_${c.id}`) ?? "").trim();
    if (handle.length < 2 || handle.length > 200) return null;
    channels[c.id] = handle;
  }
  let other: string | undefined;
  if (form.get("ch_other") === "on") {
    other = String(form.get("h_other") ?? "").trim();
    if (other.length < 3 || other.length > 500) return null;
  }
  if (Object.keys(channels).length === 0 && !other) return null;
  return other ? { channels, other } : { channels };
}

export async function checkCodeAvailableAction(raw: string): Promise<{ ok: true; code: string } | { ok: false; message: string }> {
  const check = validateCode(String(raw));
  if (!check.ok) return { ok: false, message: CODE_REASON_TEXT[check.reason] };
  if (await isCodeTaken(check.code)) return { ok: false, message: CODE_REASON_TEXT.taken };
  return { ok: true, code: check.code };
}

export async function applyPartnerAction(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in to apply." };
  const parsed = applySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Please choose what you're applying as, fill in every field and accept the Partner Agreement." };
  const { partnerType, audienceSize, promotion } = parsed.data;
  const where = readChannels(form);
  if (!where) return { error: "Tick at least one place you publish and add its handle or link (or describe it under Other)." };
  const application: PartnerApplication = { ...where, audienceSize, promotion };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const agreement = { version: PARTNER_AGREEMENT_VERSION, ipHash: ip ? hashIp(ip) : null, userAgent: h.get("user-agent") };
  // A random code is issued (never from the partner's name); they can change it later.
  let code = await issueCode();
  let r = await createApplication({ customerId: customer.id, partnerType, code, application, agreement });
  if ("error" in r && r.error === "code_taken") {
    code = await issueCode();
    r = await createApplication({ customerId: customer.id, partnerType, code, application, agreement });
  }
  if ("error" in r) {
    if (r.error === "code_taken") return { error: "Something went wrong issuing your code — please try again." };
    redirect("/partners");
  }
  const owner = alertAddress();
  const typeLabel = PARTNER_TYPES.find((t) => t.id === partnerType)?.label ?? partnerType;
  if (owner) await sendOrAlert({ to: owner, ...partnerApplicationOwnerEmail({ code, name: customer.fullName, typeLabel }) }, `partner application ${code}`);
  redirect("/partners");
}
