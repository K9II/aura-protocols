import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { UserProfileSchema } from "@/lib/profile/schema";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("id, age, biological_sex, weight_kg, activity_level, primary_goal, current_medications, using_peptides, peptides_detail, interested_in_rx, budget_tier, onboarding_complete, glp1_status, glp1_stopped_month, menopause_status")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: unknown = await request.json();
  const parsed = UserProfileSchema.omit({ id: true }).partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email, ...parsed.data }, { onConflict: "id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
