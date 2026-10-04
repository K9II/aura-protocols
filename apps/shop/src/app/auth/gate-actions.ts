"use server";

import { getCustomer } from "@/lib/dal";
import { lastVerifySentAt, sendVerifyEmail } from "@/lib/account/verify";
import { alertOwner } from "@/lib/notify";

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
