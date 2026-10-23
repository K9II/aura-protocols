"use server";

import { z } from "zod";
import { confirmsLastHour, joinWaitlist, WAITLIST_HOURLY_CAP } from "@/lib/waitlist/data";
import { parseReferralCode } from "@/lib/waitlist/codes";
import { checkDeliverable } from "@/lib/account/deliverable";
import { alertOwner } from "@/lib/notify";

// The coming-soon page's waitlist form (components/store/coming-soon/Waitlist.tsx).

export type WaitlistResult = { ok: true; email: string } | { ok: false; message: string };

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export async function joinWaitlistAction(formData: FormData): Promise<WaitlistResult> {
  // Honeypot: people never see this field; a bot that fills it is told it worked.
  if (String(formData.get("website") ?? "") !== "") return { ok: true, email: "" };
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, message: "Please enter a valid email address." };
  const email = parsed.data;
  if ((await checkDeliverable(email)) === "undeliverable") {
    return { ok: false, message: "That address can't receive email. Please check it and try again." };
  }
  try {
    const sent = await confirmsLastHour();
    if (sent >= WAITLIST_HOURLY_CAP) {
      await alertOwner("Waitlist: hourly sign-up cap reached", `${sent} confirm emails in the last hour (cap ${WAITLIST_HOURLY_CAP}); new sign-ups are asked to try again shortly. Check for a bot.`);
      return { ok: false, message: "We're getting a lot of sign-ups right now. Please try again in a few minutes." };
    }
    await joinWaitlist({ email, referredBy: parseReferralCode(String(formData.get("ref") ?? "")) });
    return { ok: true, email };
  } catch (err) {
    await alertOwner("Waitlist: sign-up failed", `${email}: ${String(err)}`);
    return { ok: false, message: "We couldn't add you just now. Please try again in a minute." };
  }
}
