import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  recommendationId: z.string().uuid().or(z.string().min(1)),
  thumbs: z.enum(["UP", "DOWN"]),
  freeText: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const { error } = await supabase.from("recommendation_feedback").insert({
    user_id: user.id, recommendation_id: parsed.data.recommendationId,
    thumbs: parsed.data.thumbs, free_text: parsed.data.freeText ?? null,
  });

  if (error) return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
