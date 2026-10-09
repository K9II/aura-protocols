import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog-live";

// AIOS "Send to store" calls this after it changes a price
// (admin_set_variant_price) so the storefront shows it now instead of at the
// next hourly refresh. Same secret as the crons (`Authorization: Bearer $CRON_SECRET`).
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  revalidateTag(CATALOG_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
