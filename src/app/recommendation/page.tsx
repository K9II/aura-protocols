import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import RecommendationClient from "./RecommendationClient";
import type { ProtocolOutput } from "@/lib/recommend/schema";

export const runtime = "nodejs";

export default async function RecommendationPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connect?next=/recommendation");

  const { data: latest } = await supabase
    .from("protocol_recommendations")
    .select("id, output")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold text-white">Your protocol</h1>
      <p className="mt-3 text-slate-300">Tuned to your last 14 days of biometrics. Re-run anytime.</p>
      <div className="mt-8">
        <RecommendationClient initial={latest ? { id: latest.id, output: latest.output as unknown as ProtocolOutput } : null} />
      </div>
    </main>
  );
}
