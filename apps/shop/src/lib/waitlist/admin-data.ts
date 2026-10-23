import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { siteUrl } from "@/lib/supabase/env";
import { shapeWaitlist, type WaitlistDbRow, type WaitlistRow } from "./admin";

// Everyone on the waitlist (subscribers with waitlist_at), shaped for the
// Command Center. The whole list is read: referrer emails and colleague
// counts need every row. Throws on a DB error.
const PAGE = 1000;

export async function listWaitlist(): Promise<WaitlistRow[]> {
  const out: WaitlistDbRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await getSupabaseAdminClient().from("subscribers")
      .select("email, status, waitlist_at, referral_code, referred_by")
      .not("waitlist_at", "is", null).order("email").range(from, from + PAGE - 1);
    if (error) throw new Error(`waitlist list failed: ${JSON.stringify(error)}`);
    const rows = (data ?? []) as WaitlistDbRow[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return shapeWaitlist(out, siteUrl());
}
