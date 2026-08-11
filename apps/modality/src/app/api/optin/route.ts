import { z } from "zod";
import { getTelehealthSupabaseClient } from "@/lib/telehealth/supabase";

const optinSchema = z.object({
  email: z.string().email(),
  category: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = optinSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { email, category } = parsed.data;

  const supabase = getTelehealthSupabaseClient();
  const { error } = await supabase
    .from("telehealth_optins")
    .upsert({ email, category, created_at: new Date().toISOString() }, { onConflict: "email" })
    .select()
    .single();

  if (error) return Response.json({ error: "Could not save opt-in" }, { status: 500 });
  return Response.json({ ok: true }, { status: 200 });
}
