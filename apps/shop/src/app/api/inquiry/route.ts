import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp } from "@/lib/gate";
import { getAccountState } from "@/lib/dal";
import { accountIdByEmail } from "@/lib/account/data";
import { createInquiry, underInquiryLimit } from "@/lib/inquiries/data";
import { newToken, sendInquiryEmail } from "@/lib/inquiries/send";
import { ackEmail, ownerNotifyEmail } from "@/lib/inquiries/emails";
import { TOPICS, inquirySubject } from "@/lib/inquiries/topics";
import { firstName, refLabel } from "@/lib/inquiries/rules";
import { INQUIRY_MESSAGE_MAX, INQUIRY_NAME_MAX, INQUIRY_ORDER_MAX, INQUIRY_ORG_MAX } from "@/lib/inquiries/constants";
import { sendEmail } from "@/lib/ses";
import { alertOwner } from "@/lib/notify";
import { siteUrl } from "@/lib/supabase/env";
import { currentMs } from "@/lib/clock";

// /contact and /wholesale. Open to everyone (locked-out people included), so:
// a honeypot field, a per-IP limit, length caps. Signed in → the account's
// name and email; signed out → linked to the account with that email, if any.
const schema = z.object({
  topic: z.enum(TOPICS),
  name: z.string().trim().min(1).max(INQUIRY_NAME_MAX).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  organization: z.string().trim().max(INQUIRY_ORG_MAX).optional(),
  orderNumber: z.string().trim().max(INQUIRY_ORDER_MAX).regex(/^[A-Za-z0-9-]*$/).optional(),
  message: z.string().trim().min(1).max(INQUIRY_MESSAGE_MAX),
  website: z.string().optional(), // honeypot: hidden from people
});

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

  try {
    await sendInquiryEmail({ to: email, ...ackEmail({ ref: created.ref, firstName: firstName(name), topic: i.topic }), token, ignore: [name, email] });
  } catch (err) {
    await alertOwner("Inquiry acknowledgement not sent", `${ref} · ${email}: ${String(err)}`);
  }

  const to = process.env.INQUIRY_NOTIFY_EMAIL;
  if (!to) console.error("INQUIRY_NOTIFY_EMAIL not set — inquiry saved; it shows in the admin");
  else {
    try {
      await sendEmail({ to, ...ownerNotifyEmail({ ref: created.ref, topic: i.topic, name, email, organization, orderNumber, message: i.message, link: `${siteUrl()}/admin/inquiries/${ref}` }) });
    } catch (err) {
      await alertOwner("Inquiry owner notification not sent", `${ref} · ${String(err)}`);
    }
  }
  return NextResponse.json({ ok: true, ref });
}
