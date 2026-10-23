import { requirePermission } from "@/lib/dal";
import { siteUrl } from "@/lib/supabase/env";
import { listWaitlist } from "@/lib/waitlist/admin-data";
import { waitlistCsv } from "@/lib/waitlist/admin";

// The whole waitlist, newest first (Waitlist → Download CSV).
export async function GET(): Promise<Response> {
  await requirePermission("waitlist.view");
  const body = waitlistCsv(await listWaitlist(), siteUrl());
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="aura-waitlist.csv"`,
      "cache-control": "no-store",
    },
  });
}
