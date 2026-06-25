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
  const [googleStatus, setGoogleStatus] = useState<"idle" | "redirecting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Both flows return to the same callback, which exchanges the code for a
  // session and forwards to `next`. safeNext already guards open-redirects.
  function callbackUrl() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function handleGoogle() {
    setGoogleStatus("redirecting");
    setErrorMsg(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // On success the browser is navigated to Google; nothing more to do here.
    if (error) {
      setGoogleStatus("error");
      setErrorMsg(error.message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) { setStatus("error"); setErrorMsg(error.message); return; }
    setStatus("sent");
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleStatus === "redirecting"}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
      >
        <GoogleIcon />
        {googleStatus === "redirecting" ? "Redirecting…" : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
        <span className="h-px flex-1 bg-white/10" />
        or
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100" />
        <button type="submit" disabled={status === "sending"}
          className="inline-flex w-full items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300 disabled:opacity-50">
          {status === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
        {status === "sent" && <p className="text-sm text-emerald-300">Check your inbox.</p>}
      </form>

      {errorMsg && (status === "error" || googleStatus === "error") && (
        <p className="text-sm text-red-300">{errorMsg}</p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
