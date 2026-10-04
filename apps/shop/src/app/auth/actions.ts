"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SESSION_ONLY_COOKIE } from "@/lib/supabase/session-only";
import { DEVICE_FLAG_COOKIE, verifyDeviceFlag } from "@/lib/gate";
import { createAccount } from "@/lib/account/create";
import { safeNext } from "@/lib/dal";
import { siteUrl } from "@/lib/supabase/env";
import { REF_COOKIE, readRef } from "@/lib/partners/ref-cookie";

export type AuthFormState = { ok?: boolean; error?: string; message?: string } | undefined;

const signUpSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(200),
  organization: z.string().trim().max(200).optional(),
});

// Shared with the gate's sign-up (lib/account/create.ts); this one serves the /sign-in page.
export async function signUpAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  if (form.get("agree") !== "on") return { error: "Please agree to the terms to create an account." };
  const parsed = signUpSchema.safeParse({
    fullName: form.get("fullName"), email: form.get("email"), password: form.get("password"),
    organization: form.get("organization") || undefined,
  });
  if (!parsed.success) return { error: "Please enter your name, a valid email and a password of at least 10 characters." };
  const { fullName, email, password, organization } = parsed.data;
  const h = await headers();
  const jar = await cookies();
  let partnerRef: string | null = null;
  try { partnerRef = readRef(jar.get(REF_COOKIE)?.value); } catch { partnerRef = null; }
  const r = await createAccount({
    fullName, email, password, organization: organization ?? null, optIn: form.get("emailOptIn") === "on",
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim(), userAgent: h.get("user-agent"),
    deviceFlagged: verifyDeviceFlag(jar.get(DEVICE_FLAG_COOKIE)?.value), partnerRef,
  });
  if (!r.ok) return { error: r.error };
  return { ok: true, message: "Account created. We've emailed you a link — confirm your address before your first order." };
}

export async function signInAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email or password isn't right." };
  // A leftover marker from an earlier session-only login must not silently make this one session-only too.
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  redirect("/");
}

export async function requestPasswordResetAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` });
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePasswordAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "That reset link has expired — request a new one." };
  redirect("/account");
}
