import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/ses";

const schema = z.object({
  kind: z.enum(["wholesale", "affiliate"]),
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(254),
  organization: z.string().trim().max(160).optional(),
  message: z.string().trim().min(1).max(4000),
});

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in every required field." }, { status: 400 });
  }
  const i = parsed.data;

  const { error } = await getSupabaseAdminClient()
    .from("inquiries")
    .insert({
      kind: i.kind,
      name: i.name,
      email: i.email.toLowerCase(),
      organization: i.organization ?? null,
      message: i.message,
    });

  // Fail closed: an inquiry we didn't record is one we can't follow up on.
  if (error) {
    console.error("inquiry insert failed:", error);
    return NextResponse.json({ error: "Could not send — please try again." }, { status: 500 });
  }

  const to = process.env.INQUIRY_NOTIFY_EMAIL;
  if (!to) {
    console.error("INQUIRY_NOTIFY_EMAIL not set — inquiry saved but nobody was notified");
  } else {
    try {
      // CR/LF in the subject could inject extra email headers — strip it
      // even though the stored/displayed name keeps its original form.
      const subjectName = i.name.replace(/[\r\n]+/g, " ");
      await sendEmail({
        to,
        subject: `New ${i.kind} inquiry — ${subjectName}`,
        html: `<p><b>${escape(i.name)}</b> &lt;${escape(i.email)}&gt;${
          i.organization ? ` — ${escape(i.organization)}` : ""
        }</p><p>${escape(i.message).replace(/\n/g, "<br>")}</p>`,
      });
    } catch (e) {
      console.error("inquiry notification failed (inquiry saved):", e);
    }
  }

  return NextResponse.json({ ok: true });
}
