import "server-only";
import { headers } from "next/headers";
import { alertOwner } from "@/lib/notify";
import { hashIp } from "@/lib/gate";

// Saves that only keep records tidy (saved address, coupon id, Stripe
// customer id) must never cancel a checkout the customer can pay; a failure
// is reported to the owner instead.
export async function bookkeep(what: string, save: () => Promise<void>, context?: string): Promise<void> {
  try {
    await save();
  } catch (err) {
    console.error(`${what} failed:`, err);
    await alertOwner(`Checkout: ${what} failed`, `${context ? `${context}\n` : ""}${String(err)}`);
  }
}

export async function requestIp(): Promise<string | null> {
  return ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
}

export async function requestIpHash(): Promise<string> {
  return hashIp((await requestIp()) ?? "unknown");
}
