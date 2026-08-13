import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import UploadClient from "./UploadClient";

export const runtime = "nodejs";

export default async function UploadPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connect?next=/upload");

  return (
    <div className="pharmacopoeia">
      <div className="p-container max-w-2xl py-16">
        <h1 className="p-serif text-3xl">Manual upload</h1>
        <p className="mt-3 text-[color:var(--ink-soft)]">Don&apos;t have a supported wearable? Paste JSON with one day&apos;s biometric numbers.</p>
        <div className="mt-8"><UploadClient /></div>
      </div>
    </div>
  );
}
