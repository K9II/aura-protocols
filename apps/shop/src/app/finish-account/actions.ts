"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ACCOUNT_CLOSED_MESSAGE } from "@/lib/constants";
import { getAccountState, getUnfinishedUser, safeNext } from "@/lib/dal";
import { finishGoogleAccount } from "@/lib/account/create";
import { REF_COOKIE, readRef } from "@/lib/partners/ref-cookie";

export type FinishState = { error?: string } | undefined;

const schema = z.object({
  fullName: z.string().trim().min(1).max(100),
  organization: z.string().trim().max(200).optional(),
});

// /finish-account: the same agreement as email sign-up, recorded through the
// one creation path (lib/account/create.ts). Marketing is the default
// (MARKETING_NOTICE on the form), as for email sign-up.
export async function finishAccountAction(_prev: FinishState, form: FormData): Promise<FinishState> {
  const next = safeNext(String(form.get("next") ?? ""), "/");
  if (form.get("agree") !== "on") return { error: "Please agree to the terms to create an account." };
  const parsed = schema.safeParse({ fullName: form.get("fullName") ?? "", organization: form.get("organization") || undefined });
  if (!parsed.success) return { error: "Please enter your full name." };

  const state = await getAccountState();
  if (state.customer) redirect(next);
  if (state.blocked) return { error: ACCOUNT_CLOSED_MESSAGE };
  const user = await getUnfinishedUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);

  const h = await headers();
  const jar = await cookies();
  let partnerRef: string | null = null;
  try { partnerRef = readRef(jar.get(REF_COOKIE)?.value); } catch { partnerRef = null; }
  const r = await finishGoogleAccount({
    userId: user.id, email: user.email, fullName: parsed.data.fullName, organization: parsed.data.organization ?? null, optIn: true,
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim(), userAgent: h.get("user-agent"),
    partnerRef, emailVerified: user.viaGoogle,
  });
  if (!r.ok) return { error: r.error };
  redirect(next);
}
