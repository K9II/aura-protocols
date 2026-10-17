import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp } from "@/lib/gate";
import { getAccountState } from "@/lib/dal";
import { accountIdByEmail } from "@/lib/account/data";
import { ackCountToday, createInquiry, underInquiryLimit } from "@/lib/inquiries/data";
import { newToken, sendInquiryEmail } from "@/lib/inquiries/send";
import { ackEmail, ownerNotifyEmail, quoteRequestAckEmail } from "@/lib/inquiries/emails";
import { getLiveCatalog } from "@/lib/catalog-live";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { QUOTE_REPLY_TEXT, cutoffFor, kitRows } from "@/lib/wholesale/rules";
import { QUOTE_REQUEST_LINES_MAX, priceByLabel, quotePriceBy, requestLinesOk } from "@/lib/wholesale/quote";
import { createQuoteRequest, syncRequestInquiry } from "@/lib/wholesale/quote-data";
import { localDate } from "@/lib/today/time";
import type { Customer } from "@/lib/dal";
import { TOPICS, inquirySubject } from "@/lib/inquiries/topics";
import { greetingName, refLabel } from "@/lib/inquiries/rules";
import { INQUIRY_ACKS_PER_EMAIL_DAY, INQUIRY_MESSAGE_MAX, INQUIRY_NAME_MAX, INQUIRY_ORDER_MAX, INQUIRY_ORG_MAX } from "@/lib/inquiries/constants";
import { sendEmail } from "@/lib/ses";
import { alertOwner } from "@/lib/notify";
import { siteUrl } from "@/lib/supabase/env";
import { currentMs } from "@/lib/clock";

// /contact and /wholesale. Open to everyone (locked-out people included), so:
// a honeypot field, a per-IP limit, length caps. Signed in → the account's
// name and email; signed out → linked to the account with that email, if any.
// Name/organization/order number strip control characters (CR/LF header
// injection, stray bytes) — they're one-line fields. The message keeps its
// newlines; it's never used anywhere header injection could matter.
const stripControl = (s: string) => s.replace(/[\x00-\x1f\x7f]/g, "");
const schema = z.object({
  topic: z.enum(TOPICS),
  name: z.string().trim().transform(stripControl).pipe(z.string().min(1).max(INQUIRY_NAME_MAX)).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  organization: z.string().trim().transform(stripControl).pipe(z.string().max(INQUIRY_ORG_MAX)).optional(),
  orderNumber: z.string().trim().transform(stripControl).pipe(z.string().max(INQUIRY_ORDER_MAX).regex(/^[A-Za-z0-9-]*$/)).optional(),
  message: z.string().trim().min(1).max(INQUIRY_MESSAGE_MAX),
  website: z.string().optional(), // honeypot: hidden from people
  // From the wholesale order sheet's "Ask for a volume quote", sent unchanged:
  // a signed-in wholesale buyer's request also becomes an order (quote-requests.sql).
  quoteLines: z.array(z.object({ slug: z.string().max(80), variantId: z.string().max(40), kits: z.number().int() })).max(QUOTE_REQUEST_LINES_MAX).optional(),
});

// The order a volume-quote request becomes. Never throws: a request that can't be
// made into an order is still a saved inquiry (the owner is alerted and prices it
// from there).
async function quoteRequestOrder(customer: Customer, lines: Array<{ slug: string; variantId: string; kits: number }>, inquiryId: string, ref: string):
  Promise<{ orderNumber: string; kits: number } | null> {
  if (!customer.wholesale?.enabledAt || customer.wholesale.disabledAt) return null;
  try {
    const [settings, live] = await Promise.all([getWholesaleSettings(), getLiveCatalog()]);
    if (!settings.open) return null;
    const rows = kitRows(live.shown);
    const ok = requestLinesOk(lines, rows);
    if (!ok.ok) {
      await alertOwner("Quote request not made into an order", `${ref} · ${customer.email}: ${ok.reason}. Price it from the inquiry.`);
      return null;
    }
    const today = localDate(currentMs());
    const order = await createQuoteRequest({
      customerId: customer.id, email: customer.email, lines: ok.lines, rows,
      pricing: { tiers: settings.tiers, depositPct: settings.depositPct, minKits: settings.minKits },
      cutoffOn: cutoffFor(today, { runDays: settings.runDays, override: settings.nextCutoffOverride }),
      inquiryId, kitBoxCents: settings.kitBoxCents,
    });
    await syncRequestInquiry(inquiryId, "requested", order.orderNumber);
    return { orderNumber: order.orderNumber, kits: ok.kits };
  } catch (err) {
    await alertOwner("Quote request not made into an order", `${ref} · ${customer.email}: ${String(err)}. Price it from the inquiry.`);
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please fill in every required field." }, { status: 400 });
  const i = parsed.data;
  if (i.website) return NextResponse.json({ ok: true, ref: null });

  const { customer } = await getAccountState().catch(() => ({ customer: null }));
  const name = customer?.fullName ?? i.name;
  const email = customer?.email?.toLowerCase() ?? i.email;
  if (!name || !email) return NextResponse.json({ error: "Please fill in every required field." }, { status: 400 });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = hashIp(ip);
  try {
    if (!(await underInquiryLimit(ipHash, currentMs()))) {
      return NextResponse.json({ error: "You've sent several messages already — please wait an hour and try again." }, { status: 429 });
    }
  } catch (err) {
    console.error("inquiry limit check failed:", err);
    return NextResponse.json({ error: "Could not send — please try again." }, { status: 500 });
  }

  let customerId = customer?.id ?? null;
  if (!customerId) {
    try { customerId = await accountIdByEmail(email); }
    catch (err) { console.error("inquiry account lookup failed (saved unlinked):", err); }
  }
  const organization = i.organization || null;
  const orderNumber = i.orderNumber ? i.orderNumber.toUpperCase() : null;
  const token = newToken();

  let created: { id: string; ref: number };
  try {
    created = await createInquiry({
      topic: i.topic, subject: inquirySubject(i.topic, orderNumber, organization), name, email, organization, orderNumber,
      message: i.message, customerId, token, ipHash,
    });
  } catch (err) {
    // Fail closed: an inquiry we didn't record is one we can't follow up on.
    console.error("inquiry insert failed:", err);
    return NextResponse.json({ error: "Could not send — please try again." }, { status: 500 });
  }
  const ref = refLabel(created.ref);
  const quote = customer && i.topic === "wholesale" && i.quoteLines?.length ? await quoteRequestOrder(customer, i.quoteLines, created.id, ref) : null;
  const priceBy = priceByLabel(quotePriceBy(new Date(currentMs()).toISOString()));

  // The form takes any address, so cap acknowledgements per recipient
  // regardless of who's submitting — past the limit, the inquiry is still
  // saved and the owner still notified below, just without the ack email.
  // On a failed check, skip the ack rather than risk mailing a stranger.
  const underAckLimit = await ackCountToday(email, currentMs()).then((n) => n < INQUIRY_ACKS_PER_EMAIL_DAY).catch((err) => {
    console.error("inquiry ack-limit check failed (ack skipped):", err);
    return false;
  });
  if (underAckLimit) {
    try {
      const ack = quote
        ? quoteRequestAckEmail({ ref: created.ref, firstName: greetingName(name), orderNumber: quote.orderNumber, kits: quote.kits, within: QUOTE_REPLY_TEXT, priceBy, link: `${siteUrl()}/order/${quote.orderNumber}` })
        : ackEmail({ ref: created.ref, firstName: greetingName(name), topic: i.topic });
      await sendInquiryEmail({ to: email, ...ack, token, ignore: [name, email] });
    } catch (err) {
      await alertOwner("Inquiry acknowledgement not sent", `${ref} · ${email}: ${String(err)}`);
    }
  }

  const to = process.env.INQUIRY_NOTIFY_EMAIL;
  if (!to) console.error("INQUIRY_NOTIFY_EMAIL not set — inquiry saved; it shows in the admin");
  else {
    try {
      await sendEmail({ to, ...ownerNotifyEmail({
        ref: created.ref, topic: i.topic, name, email, organization, orderNumber: quote?.orderNumber ?? orderNumber, message: i.message, link: `${siteUrl()}/admin/inquiries/${ref}`,
        quote: quote ? { orderNumber: quote.orderNumber, kits: quote.kits, priceBy, link: `${siteUrl()}/admin/orders/${quote.orderNumber}` } : undefined,
      }) });
    } catch (err) {
      await alertOwner("Inquiry owner notification not sent", `${ref} · ${String(err)}`);
    }
  }
  return NextResponse.json({ ok: true, ref, orderNumber: quote?.orderNumber ?? null });
}
