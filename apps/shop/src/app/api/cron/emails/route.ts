import { NextResponse } from "next/server";
import { getSubscriber, sendTracked, sentKinds, welcomeSendsFor, listWelcomeCandidates, markSkipped } from "@/lib/email/data";
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
import { finishRun, getEmailSettings, startRun } from "@/lib/email/admin-data";
import { campaignsToRun, startCampaign } from "@/lib/email/campaigns/data";
import { sendCampaignBatch } from "@/lib/email/campaigns/send";
import { checksFor } from "@/lib/email/campaigns/checks-server";
import { isBlocked } from "@/lib/email/campaigns/checks";
import { SEND_TIME_BUDGET_MS } from "@/lib/email/constants";

// Vercel caps a Hobby/Pro cron function at a lower default; this run can
// legitimately take a few minutes on a large list (see the time budget below).
export const maxDuration = 300;

// Hourly (vercel.json). Welcome files, abandoned-checkout reminders (each
// skipped while paused in the admin), then campaigns (the one sending, then
// any scheduled that are due). Records every run in email_runs for the
// admin's health line. Every send goes through sendTracked, so a re-run
// never double-sends. Failures don't stop the run; they're reported to the
// owner in one alert. Each section (welcome list, cart list, each campaign)
// runs under its own try/catch, so a failure in one never skips the rest.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = Date.now(), site = siteUrl();
  const deadline = now + SEND_TIME_BUDGET_MS;
  let welcome = 0, cart = 0, cartSkipped = 0, campaign = 0, remaining = 0, truncated = false;
  const failed: string[] = [];
  let runId: string | null = null;
  try { runId = await startRun(); } catch (err) { failed.push(`run record: ${err instanceof Error ? err.message : String(err)}`); }
  // A failed settings read skips both automations (they might be paused) and alerts.
  let settings: { welcomePaused: boolean; cartPaused: boolean } | null = null;
  try { settings = await getEmailSettings(); } catch (err) { failed.push(`email settings: ${err instanceof Error ? err.message : String(err)}`); }

  if (settings && !settings.welcomePaused) {
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
          const unsub = unsubscribeUrl(site, s.email, kind);
          if ((await sendTracked({ email: s.email, kind, ref: null, msg: welcomeEmail(n, { site, unsubscribeUrl: unsub }, offer), unsubscribeUrl: unsub })) === "sent") welcome++;
        } catch (err) {
          failed.push(`welcome ${s.email}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      failed.push(`welcome list: ${err instanceof Error ? err.message : String(err)}`);
    }
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
  // Per product AND strength: the lot selling now; else the last one that
  // sold out; never a retired lot.
  const coaFor = (slug: string, variantId: string) => {
    const lots = live?.lots.filter((l) => l.slug === slug && l.variantId === variantId) ?? [];
    return (lots.find((l) => l.status === "live") ?? lots.findLast((l) => l.status === "sold_out"))?.coaFile || null;
  };

  // Once the budget is spent, don't start a second list — the next hourly
  // run continues where this one stopped.
  if (settings && !truncated && live) {
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
          if (settings.cartPaused) {
            if (await markSkipped(o.email, kind, o.id)) cartSkipped++;
            continue;
          }
          const unsub = unsubscribeUrl(site, o.email, kind);
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

  // Campaigns: the one that's sending, then scheduled ones that are due — one
  // at a time, with whatever time is left. A campaign that throws (e.g. its
  // send engine hits a config error) is alerted and skipped — it must not
  // stop the next due campaign, let alone the welcome/cart sends above.
  if (!truncated) {
    try {
      for (const c of await campaignsToRun(now)) {
        if (Date.now() > deadline) { truncated = true; break; }
        if (c.status === "scheduled") {
          // Things may have changed since it was scheduled (code paused, lot sold out).
          // It stays scheduled and the owner is alerted every hour until it's fixed or unscheduled.
          const blocks = (await checksFor(c, now)).filter((x) => x.level === "block");
          if (isBlocked(blocks)) {
            failed.push(`campaign "${c.name}": checks failed — not sent (${blocks.map((x) => x.text).join(" ")})`);
            continue;
          }
          const s = await startCampaign(c.id, null, "scheduled");
          if (!s.ok) {
            if (s.reason === "busy") break; // another campaign is still sending; next run
            continue; // stale: someone unscheduled or started it
          }
        }
        try {
          const r = await sendCampaignBatch(c.id, deadline);
          campaign += r.sent;
          if (r.remaining > 0 && !r.stopped) break; // out of time; it continues next run
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          failed.push(`campaign "${c.name}": ${message}`);
          await alertOwner(`Email run: campaign "${c.name}" failed`, message);
          continue;
        }
      }
    } catch (err) {
      failed.push(`campaigns: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (truncated) failed.push(`run truncated: ${remaining} remaining`);
  if (failed.length) await alertOwner(`Email run: ${failed.length} failed`, failed.join("\n"));
  if (runId) {
    try { await finishRun(runId, { welcome, cart, cartSkipped, campaign, failures: failed }); }
    catch (err) { await alertOwner("Email run not recorded", err instanceof Error ? err.message : String(err)); }
  }
  return NextResponse.json({ welcome, cart, cartSkipped, campaign, failed: failed.length });
}
