import "server-only";
import { cookies } from "next/headers";
import { isPrelaunch } from "@/lib/prelaunch";
import { EARLY_COOKIE, readEarlyCookie } from "@/lib/early/token";
import { earlyAccessOpen } from "@/lib/early/data";

// This browser holds a valid early-access cookie and the owner's switch is on.
export async function hasEarlyAccess(): Promise<boolean> {
  if (!readEarlyCookie((await cookies()).get(EARLY_COOKIE)?.value)) return false;
  try {
    return await earlyAccessOpen();
  } catch (err) {
    console.error("early access switch:", err);
    return false;
  }
}

// Before launch: the coming-soon page, unless this browser has early access. After launch
// cookies() is never read here, so store pages render as they always did.
export async function showComingSoon(): Promise<boolean> {
  return isPrelaunch() && !(await hasEarlyAccess());
}
