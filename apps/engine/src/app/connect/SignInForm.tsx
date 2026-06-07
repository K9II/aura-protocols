"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/safe-next";

export default function SignInForm() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = getSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) { setStatus("error"); setErrorMsg(error.message); return; }
    setStatus("sent");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100" />
      <button type="submit" disabled={status === "sending"}
        className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300 disabled:opacity-50">
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {status === "sent" && <p className="text-sm text-emerald-300">Check your inbox.</p>}
      {status === "error" && <p className="text-sm text-red-300">{errorMsg}</p>}
    </form>
  );
}
