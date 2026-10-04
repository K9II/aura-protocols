"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { getCustomer } from "@/lib/dal";
import { lastVerifySentAt, sendVerifyEmail } from "@/lib/account/verify";
import { alertOwner } from "@/lib/notify";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAccount } from "@/lib/account/create";
import { DEVICE_FLAG_COOKIE, verifyDeviceFlag } from "@/lib/gate";
import { REF_COOKIE, readRef } from "@/lib/partners/ref-cookie";

export type GateResult = { ok: true; verifyRequired?: boolean; error?: undefined } | { ok?: false; error: string };

const RESEND_COOLDOWN_MS = 60 * 1000;

export async function resendVerifyAction(): Promise<GateResult> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in first." };
  if (customer.emailConfirmed) return { error: "Your email is already confirmed." };
  const last = await lastVerifySentAt(customer.id);
  if (last && Date.now() - Date.parse(last) < RESEND_COOLDOWN_MS) return { error: "We just sent one — check your inbox (and spam) first." };
  try {
    await sendVerifyEmail(customer.id, customer.email);
    return { ok: true };
  } catch (err) {
    await alertOwner("Verification email not sent", `${customer.email}: ${String(err)}`);
    return { error: "We couldn't send the email just now — please try again in a few minutes." };
  }
}

// The gate's own actions return a result instead of redirecting: the gate
// reloads the page itself so the header and server-rendered parts pick up
// the new session.
export async function gateSignInAction(input: { email: string; password: string; remember: boolean }): Promise<GateResult> {
  const email = String(input.email ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(input.password ?? "").slice(0, 200);
  const supabase = await createSupabaseServerClient({ sessionOnly: input.remember !== true });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email or password isn't right." };
  return { ok: true };
}

const gateSignUpSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(1).max(100),
  password: z.string().min(10).max(200),
  agreed: z.literal(true),
  optIn: z.boolean(),
});

export async function gateSignUpAction(input: { email: string; fullName: string; password: string; agreed: boolean; optIn: boolean }): Promise<GateResult> {
  if (input?.agreed !== true) return { error: "Please agree to the terms to create an account." };
  const parsed = gateSignUpSchema.safeParse(input);
  if (!parsed.success) return { error: "Please enter your name and a password of at least 10 characters." };
  const h = await headers();
  const jar = await cookies();
  let partnerRef: string | null = null;
  try { partnerRef = readRef(jar.get(REF_COOKIE)?.value); } catch { partnerRef = null; }
  const r = await createAccount({
    fullName: parsed.data.fullName, email: parsed.data.email, password: parsed.data.password, organization: null, optIn: parsed.data.optIn,
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim(), userAgent: h.get("user-agent"),
    deviceFlagged: verifyDeviceFlag(jar.get(DEVICE_FLAG_COOKIE)?.value), partnerRef,
  });
  if (!r.ok) return { error: r.error };
  return { ok: true, verifyRequired: r.verifyRequired };
}
