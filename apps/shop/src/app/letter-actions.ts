"use server";

import { getCustomer } from "@/lib/dal";
import { z } from "zod";
import { letterState, subscribeOtherEmail, subscribeToLetter, type LetterState } from "@/lib/email/letter";
import { normalizeEmail } from "@/lib/email/links";
import { alertOwner } from "@/lib/notify";

// The Aura letter box (components/store/AuraLetter.tsx). Signed-in shoppers only.
// The account's own email joins through the account opt-in; any other address
// gets a confirm-by-email link first (lib/email/letter.ts).

export type LetterStatus = { signedIn: false } | { signedIn: true; email: string; state: LetterState; verified: boolean };
export type LetterResult = { ok: true; state: "confirmed" | "pending" | "check_inbox"; email: string } | { ok: false; message: string };

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export async function letterStatusAction(): Promise<LetterStatus> {
  const customer = await getCustomer();
  if (!customer) return { signedIn: false };
  return { signedIn: true, email: customer.email, state: await letterState(customer.email), verified: customer.emailConfirmed };
}

export async function subscribeLetterAction(formData: FormData): Promise<LetterResult> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, message: "Please sign in to subscribe." };
  if (formData.get("consent") !== "on") return { ok: false, message: "Please tick the box to agree to the emails." };
  const parsed = emailSchema.safeParse(formData.get("email") ?? customer.email);
  if (!parsed.success) return { ok: false, message: "Please enter a valid email address." };
  const email = parsed.data;
  try {
    if (email === normalizeEmail(customer.email)) return { ok: true, state: await subscribeToLetter(customer), email: customer.email };
    return { ok: true, state: await subscribeOtherEmail(email), email };
  } catch (err) {
    await alertOwner("Aura letter: subscribe failed", `${email} (account ${customer.email}): ${String(err)}`);
    return { ok: false, message: "We couldn't add you just now — please try again." };
  }
}
