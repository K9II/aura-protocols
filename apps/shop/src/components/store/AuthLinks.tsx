"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOutAction } from "@/app/auth/actions";

// Display-only sign-in state, read in the browser after load so every page can
// stay static. Real authorization happens server-side in lib/dal.ts.
export default function AuthLinks() {
  const [state, setState] = useState<"unknown" | "out" | "in">("unknown");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    // Deferred so a broken/missing Supabase env falls back to "out" via a
    // microtask rather than a setState call synchronous with the effect body.
    Promise.resolve().then(() => {
      let supabase: ReturnType<typeof createSupabaseBrowserClient>;
      try { supabase = createSupabaseBrowserClient(); } catch { setState("out"); return; }
      supabase.auth.getSession().then(({ data }) => setState(data.session ? "in" : "out"));
      const { data } = supabase.auth.onAuthStateChange((_event, session) => setState(session ? "in" : "out"));
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => unsubscribe?.();
  }, []);

  if (state === "unknown") return <span className="s-nav-auth" aria-hidden />;
  if (state === "out") return <Link href="/sign-in" className="s-nav-auth">Sign in</Link>;
  return (
    <>
      <Link href="/account" className="s-nav-auth">Account</Link>
      <form action={signOutAction} className="s-nav-signout">
        <button type="submit" className="s-nav-cart">Sign out</button>
      </form>
    </>
  );
}
