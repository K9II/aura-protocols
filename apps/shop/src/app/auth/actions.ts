"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { hashIp } from "@/lib/gate";
import { TERMS_VERSION } from "@/lib/gate-shared";
import { safeNext } from "@/lib/dal";
import { siteUrl } from "@/lib/supabase/env";

export type AuthFormState = { ok?: boolean; error?: string; message?: string } | undefined;

const signUpSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(200),
  organization: z.string().trim().max(200).optional(),
});

export async function signUpAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  if (form.get("age21") !== "on" || form.get("ruo") !== "on" || form.get("dispute") !== "on") {
    return { error: "Please confirm all three agreements to create an account." };
  }
  const parsed = signUpSchema.safeParse({
    fullName: form.get("fullName"), email: form.get("email"), password: form.get("password"),
    organization: form.get("organization") || undefined,
  });
  if (!parsed.success) return { error: "Please enter your name, a valid email and a password of at least 10 characters." };
  const { fullName, email, password, organization } = parsed.data;
  const next = safeNext(String(form.get("next") ?? ""), "/checkout");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`, data: { full_name: fullName } },
  });
  if (error || !data.user) return { error: error?.message.includes("registered") ? "An account with this email already exists — sign in instead." : "We couldn't create your account — please try again." };

  const admin = getSupabaseAdminClient();
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const { error: cErr } = await admin.from("customers").insert({ id: data.user.id, full_name: fullName, organization: organization ?? null });
  const { error: aErr } = cErr ? { error: cErr } : await admin.from("account_agreements").insert({
    customer_id: data.user.id, terms_version: TERMS_VERSION, age_21: true, ruo: true, dispute_policy: true,
    ip_hash: ip ? hashIp(ip) : null, user_agent: h.get("user-agent"),
  });
  if (cErr || aErr) {
    // No half-created accounts: an account must carry its agreements record.
    console.error("sign-up record insert failed:", cErr ?? aErr);
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "We couldn't create your account — please try again." };
  }
  return { ok: true, message: "Check your email and click the link to verify your address. Then you can check out." };
}

export async function signInAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email or password isn't right." };
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
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
