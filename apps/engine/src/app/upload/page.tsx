import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import UploadClient from "./UploadClient";

export const runtime = "nodejs";

export default async function UploadPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connect?next=/upload");
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-bold text-white">Manual upload</h1>
      <p className="mt-3 text-slate-300">Don&apos;t have a supported wearable? Paste JSON with one day&apos;s biometric numbers.</p>
      <div className="mt-8"><UploadClient /></div>
    </main>
  );
}
