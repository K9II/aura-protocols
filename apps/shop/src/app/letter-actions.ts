"use server";

import { getCustomer } from "@/lib/dal";
import { letterState, subscribeToLetter, type LetterState } from "@/lib/email/letter";
import { alertOwner } from "@/lib/notify";

// The Aura letter box (components/store/AuraLetter.tsx). Signed-in shoppers only:
// it subscribes the account's own email.

export type LetterStatus = { signedIn: false } | { signedIn: true; email: string; state: LetterState; verified: boolean };
export type LetterResult = { ok: true; state: "confirmed" | "pending"; email: string } | { ok: false; message: string };

export async function letterStatusAction(): Promise<LetterStatus> {
  const customer = await getCustomer();
  if (!customer) return { signedIn: false };
  return { signedIn: true, email: customer.email, state: await letterState(customer.email), verified: customer.emailConfirmed };
}

export async function subscribeLetterAction(formData: FormData): Promise<LetterResult> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, message: "Please sign in to subscribe." };
  if (formData.get("consent") !== "on") return { ok: false, message: "Please tick the box to agree to the emails." };
  try {
    return { ok: true, state: await subscribeToLetter(customer), email: customer.email };
  } catch (err) {
    await alertOwner("Aura letter: subscribe failed", `${customer.email}: ${String(err)}`);
    return { ok: false, message: "We couldn't add you just now — please try again." };
  }
}
