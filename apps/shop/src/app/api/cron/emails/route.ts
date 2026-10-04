import { NextResponse } from "next/server";
import { getSubscriber, lastWelcomeSentAt, listWelcomeCandidates, sendTracked, sentKinds } from "@/lib/email/data";
import { listAbandonedCheckouts } from "@/lib/email/cart";
import { dueCart, dueWelcome } from "@/lib/email/schedule";
import { cartEmail, welcomeEmail } from "@/lib/emails-marketing";
import { unsubscribeUrl } from "@/lib/email/links";
import { siteUrl } from "@/lib/supabase/env";
import { alertOwner } from "@/lib/notify";
import { compounds } from "@/data/catalog";
import { isPendingLot } from "@/lib/catalog";

// Hourly (vercel.json). Sends the next welcome file to each subscriber in
// their first 21 days and the due abandoned-checkout reminder. Every send
// goes through sendTracked, so a re-run never double-sends. Failures don't
// stop the run; they're reported to the owner in one alert.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = Date.now(), site = siteUrl();
  let welcome = 0, cart = 0;
  const failed: string[] = [];

  for (const s of await listWelcomeCandidates(new Date(now - 21 * 24 * 3600 * 1000).toISOString())) {
    try {
      if (!s.confirmed_at) continue;
      const kind = dueWelcome(Date.parse(s.confirmed_at), now, await sentKinds(s.email), await lastWelcomeSentAt(s.email));
      if (!kind) continue;
      const n = Number(kind.slice(-1)) as 1 | 2 | 3 | 4 | 5;
      const live = s.welcome_code && s.welcome_code_expires_at && !s.welcome_code_used_order_id && Date.parse(s.welcome_code_expires_at) > now;
      const code = live ? { code: s.welcome_code!, expiresAt: s.welcome_code_expires_at! } : null;
      const unsub = unsubscribeUrl(site, s.email);
      if ((await sendTracked({ email: s.email, kind, ref: null, msg: welcomeEmail(n, { site, unsubscribeUrl: unsub }, code), unsubscribeUrl: unsub })) === "sent") welcome++;
    } catch (err) {
      failed.push(`welcome ${s.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const coaFor = (slug: string) => {
    const c = compounds.find((x) => x.slug === slug);
    return c && !isPendingLot(c.currentLot) && c.currentLot.coaFile ? c.currentLot.coaFile : null;
  };
  for (const o of await listAbandonedCheckouts(now)) {
    try {
      if ((await getSubscriber(o.email))?.status === "unsubscribed") continue;
      const sent = new Set([...(await sentKinds(o.email))].filter((k) => k.endsWith(`:${o.id}`)).map((k) => k.split(":")[0]));
      const kind = dueCart(Date.parse(o.created_at), now, sent);
      if (!kind) continue;
      const unsub = unsubscribeUrl(site, o.email);
      const msg = cartEmail(Number(kind.slice(-1)) as 1 | 2 | 3, { site, unsubscribeUrl: unsub }, o, coaFor);
      if ((await sendTracked({ email: o.email, kind, ref: o.id, msg, unsubscribeUrl: unsub })) === "sent") cart++;
    } catch (err) {
      failed.push(`cart ${o.order_number}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (failed.length) await alertOwner(`Email run: ${failed.length} failed`, failed.join("\n"));
  return NextResponse.json({ welcome, cart, failed: failed.length });
}
