import { NextResponse } from "next/server";
import { getSubscriber, sendTracked, sentKinds, welcomeSendsFor, listWelcomeCandidates } from "@/lib/email/data";
import { listAbandonedCheckouts } from "@/lib/email/cart";
import { getOrderById } from "@/lib/orders";
import { dueCart, dueWelcome } from "@/lib/email/schedule";
import { cartEmail, welcomeEmail } from "@/lib/emails-marketing";
import { unsubscribeUrl } from "@/lib/email/links";
import { siteUrl } from "@/lib/supabase/env";
import { alertOwner } from "@/lib/notify";
import { getLiveCatalog } from "@/lib/catalog-live";
import type { LiveCatalog } from "@/lib/catalog-merge";
import type { ChemicalClass } from "@/data/catalog";
import { offerForEmail } from "@/lib/account/offer-data";

// Vercel caps a Hobby/Pro cron function at a lower default; this run can
// legitimately take a few minutes on a large list (see the time budget below).
export const maxDuration = 300;

// Stop sending with enough headroom before Vercel's own limit (maxDuration)
// cuts the function off mid-send; the rest picks up on next hour's run.
const TIME_BUDGET_MS = 240_000;

// Hourly (vercel.json). Sends the next welcome file to each subscriber in
// their first 21 days and the due abandoned-checkout reminder. Every send
// goes through sendTracked, so a re-run never double-sends. Failures don't
// stop the run; they're reported to the owner in one alert. The welcome list
// and the cart list are each fetched/looped under their own try/catch, so a
// failure in one never skips the other.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = Date.now(), site = siteUrl();
  const deadline = now + TIME_BUDGET_MS;
  let welcome = 0, cart = 0, remaining = 0, truncated = false;
  const failed: string[] = [];

  try {
    const candidates = await listWelcomeCandidates(new Date(now - 21 * 24 * 3600 * 1000).toISOString());
    // One batched read for the whole list instead of two reads per
    // candidate (sentKinds + a last-sent lookup).
    const sends = await welcomeSendsFor(candidates.map((s) => s.email));
    for (let i = 0; i < candidates.length; i++) {
      if (Date.now() > deadline) { truncated = true; remaining += candidates.length - i; break; }
      const s = candidates[i];
      try {
        if (!s.confirmed_at) continue;
        const info = sends.get(s.email) ?? { kinds: new Set<string>(), lastSentMs: null };
        const kind = dueWelcome(Date.parse(s.confirmed_at), now, info.kinds, info.lastSentMs);
        if (!kind) continue;
        const n = Number(kind.slice(-1)) as 1 | 2 | 3 | 4 | 5;
        const offer = n === 1 || n === 5 ? await offerForEmail(s.email) : null;
        const unsub = unsubscribeUrl(site, s.email);
        if ((await sendTracked({ email: s.email, kind, ref: null, msg: welcomeEmail(n, { site, unsubscribeUrl: unsub }, offer), unsubscribeUrl: unsub })) === "sent") welcome++;
      } catch (err) {
        failed.push(`welcome ${s.email}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    failed.push(`welcome list: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Cart reminders link the current certificate, so they need the live
  // catalog; if it can't be read, the cart list waits for the next run.
  let live: LiveCatalog<ChemicalClass> | null = null;
  if (!truncated) {
    try {
      live = await getLiveCatalog();
    } catch (err) {
      failed.push(`live catalog: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  const coaFor = (slug: string) =>
    live?.lots.find((l) => l.slug === slug && l.status !== "retired")?.coaFile || null;

  // Once the budget is spent, don't start a second list — the next hourly
  // run continues where this one stopped.
  if (!truncated && live) {
    try {
      const checkouts = await listAbandonedCheckouts(now);
      for (let i = 0; i < checkouts.length; i++) {
        if (Date.now() > deadline) { truncated = true; remaining += checkouts.length - i; break; }
        const o = checkouts[i];
        try {
          const sub = await getSubscriber(o.email);
          if (sub?.status === "unsubscribed") continue;
          const sent = new Set([...(await sentKinds(o.email))].filter((k) => k.endsWith(`:${o.id}`)).map((k) => k.split(":")[0]));
          const kind = dueCart(Date.parse(o.created_at), now, sent);
          if (!kind) continue;
          const unsub = unsubscribeUrl(site, o.email);
          // A non-subscriber (or one who hasn't confirmed) must see the
          // promotional-reminder disclosure (CAN-SPAM §7704(a)(5)(A)(i)).
          const promo = sub?.status !== "confirmed";
          const msg = cartEmail(Number(kind.slice(-1)) as 1 | 2 | 3, { site, unsubscribeUrl: unsub }, o, coaFor, promo);
          // The order may have been paid or cancelled since it was listed;
          // re-check right before sending so a reminder never goes out for
          // a checkout that's no longer open.
          const fresh = await getOrderById(o.id);
          if (!fresh || fresh.status !== "awaiting_payment") continue;
          if ((await sendTracked({ email: o.email, kind, ref: o.id, msg, unsubscribeUrl: unsub })) === "sent") cart++;
        } catch (err) {
          failed.push(`cart ${o.order_number}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      failed.push(`cart list: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (truncated) failed.push(`run truncated: ${remaining} remaining`);
  if (failed.length) await alertOwner(`Email run: ${failed.length} failed`, failed.join("\n"));
  return NextResponse.json({ welcome, cart, failed: failed.length });
}
