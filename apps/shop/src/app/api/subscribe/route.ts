import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendLeadMagnetEmail } from "@/lib/ses";
import { getLeadMagnetTemplate, type LeadMagnetGoal } from "@/lib/leadMagnetEmails";

const subscribeSchema = z.object({
  email: z.string().email(),
  goal: z.enum([
    "Maintaining Muscle During GLP-1",
    "Weight Loss",
    "Muscle & Performance",
    "Sleep & Recovery",
  ]),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, goal } = parsed.data;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("lead_magnet_contacts")
    .upsert(
      { email, goal, last_sent_at: new Date().toISOString() },
      { onConflict: "email" }
    )
    .select()
    .single();

  if (error) {
    return Response.json({ error: "Could not save contact" }, { status: 500 });
  }

  const template = getLeadMagnetTemplate(goal as LeadMagnetGoal);
  try {
    await sendLeadMagnetEmail({ to: email, subject: template.subject, html: template.html });
  } catch (sendError) {
    // The contact is already saved, so the subscription itself succeeded.
    // Email delivery is best-effort — a send failure (SES sandbox, throttling,
    // transient outage) must not 500 a visitor who is now subscribed. Log it
    // for retry/investigation and still report success.
    console.error(`Lead-magnet email send failed for ${email}:`, sendError);
  }

  return Response.json({ ok: true }, { status: 200 });
}
