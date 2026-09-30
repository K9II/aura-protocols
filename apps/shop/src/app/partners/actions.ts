"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCustomer, requireApprovedPartner } from "@/lib/dal";
import { changeCode, createApplication, isCodeTaken, issueCode, setPayoutMethod, setPayoutPref, uploadW9 } from "@/lib/partners/data";
import { AUDIENCE_SIZE_IDS, CODE_REASON_TEXT, PARTNER_AGREEMENT_VERSION, PARTNER_TYPE_IDS, PARTNER_TYPES, PUBLISH_CHANNELS, validateCode, type PartnerApplication } from "@/lib/partners/codes";
import { hashIp } from "@/lib/gate";
import { alertAddress, sendOrAlert } from "@/lib/notify";
import { ownerW9UploadedEmail, partnerApplicationOwnerEmail } from "@/lib/emails-partners";

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
  const customer = await getCustomer();
  if (!customer) return { ok: false, message: "Please sign in." };
  if (!customer.emailConfirmed) return { ok: false, message: "Please verify your email first — check your inbox for the link." };
  const check = validateCode(String(raw));
  if (!check.ok) return { ok: false, message: CODE_REASON_TEXT[check.reason] };
  if (await isCodeTaken(check.code)) return { ok: false, message: CODE_REASON_TEXT.taken };
  return { ok: true, code: check.code };
}

export async function applyPartnerAction(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in to apply." };
  if (!customer.emailConfirmed) return { error: "Please verify your email first — check your inbox for the link." };
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

export type SettingsState = { ok?: boolean; error?: string } | undefined;

const prefSchema = z.object({ pref: z.enum(["cash", "credit", "split"]), splitCashPct: z.coerce.number().int().min(0).max(100) });
const methodSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ach"), routing: z.string().regex(/^\d{9}$/), account: z.string().regex(/^\d{4,17}$/), bank: z.string().trim().min(2).max(60) }),
  z.object({ kind: z.literal("zelle"), handle: z.union([z.string().email().max(254), z.string().regex(/^\+?1?\d{10}$/)]) }),
]);
const W9_MAX_BYTES = 5 * 1024 * 1024;

// Old code becomes an alias (lib/partners/data.ts changeCode), so shared links keep working.
export async function changeCodeAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const { partner } = await requireApprovedPartner();
  const check = await checkCodeAvailableAction(String(form.get("code") ?? ""));
  if (!check.ok) return { error: check.message };
  if (check.code === partner.code) return { ok: true };
  const r = await changeCode(partner.id, partner.code, check.code);
  if ("error" in r) return { error: CODE_REASON_TEXT.taken };
  revalidatePath("/partners");
  return { ok: true };
}

export async function setPayoutPrefAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const { partner } = await requireApprovedPartner();
  const parsed = prefSchema.safeParse({ pref: form.get("pref"), splitCashPct: form.get("splitCashPct") ?? 50 });
  if (!parsed.success) return { error: "Choose cash, store credit or a split between 0 and 100%." };
  await setPayoutPref(partner.id, parsed.data.pref, parsed.data.splitCashPct);
  revalidatePath("/partners");
  return { ok: true };
}

export async function setPayoutMethodAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const { partner } = await requireApprovedPartner();
  const kind = form.get("kind");
  const raw = kind === "ach"
    ? { kind, routing: String(form.get("routing") ?? "").trim(), account: String(form.get("account") ?? "").trim(), bank: String(form.get("bank") ?? "") }
    : { kind, handle: String(form.get("handle") ?? "").trim() };
  const parsed = methodSchema.safeParse(raw);
  if (!parsed.success) return { error: kind === "ach" ? "Enter a 9-digit routing number, your account number and bank name." : "Enter the email or US phone number registered with Zelle." };
  await setPayoutMethod(partner.id, parsed.data);
  revalidatePath("/partners");
  return { ok: true };
}

export async function uploadW9Action(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const { partner } = await requireApprovedPartner();
  const file = form.get("w9");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose your signed W-9 (PDF)." };
  if (file.size > W9_MAX_BYTES) return { error: "The W-9 must be a PDF of 5 MB or less." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // "%PDF"
  if (!isPdf) return { error: "The W-9 must be a PDF file." };
  await uploadW9(partner.id, bytes);
  const owner = alertAddress();
  if (owner) await sendOrAlert({ to: owner, ...ownerW9UploadedEmail(partner.code) }, `w9 ${partner.code}`);
  revalidatePath("/partners");
  return { ok: true };
}
