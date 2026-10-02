"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOutAction } from "@/app/auth/actions";

// Display-only sign-in state, read in the browser after load so every page can
// stay static. Real authorization happens server-side in lib/dal.ts.
export default function AuthLinks() {
  const pathname = usePathname();
  const [state, setState] = useState<"unknown" | "out" | "in">("unknown");
  const [owner, setOwner] = useState(false);

  // Owner status lives server-side (customers has no browser access), so ask once signed in.
  useEffect(() => {
    if (state !== "in") return;
    let cancelled = false;
    fetch("/api/me/owner", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { owner: false }))
      .then((d: { owner?: boolean }) => { if (!cancelled) setOwner(d.owner === true); })
      .catch(() => { if (!cancelled) setOwner(false); });
    // leaving "in" (sign-out) clears it, so the next account never inherits the link
    return () => { cancelled = true; setOwner(false); };
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    // Deferred so a broken/missing Supabase env falls back to "out" via a
    // microtask rather than a setState call synchronous with the effect body.
    Promise.resolve().then(() => {
      if (cancelled) return;
      let supabase: ReturnType<typeof createSupabaseBrowserClient>;
      try { supabase = createSupabaseBrowserClient(); } catch { if (!cancelled) setState("out"); return; }
      supabase.auth.getSession().then(({ data }) => { if (!cancelled) setState(data.session ? "in" : "out"); });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (!cancelled) setState(session ? "in" : "out"); });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => { cancelled = true; unsubscribe?.(); };
    // Re-check on every page change: sign-in and sign-out run as server actions that
    // move to a new page without a reload, so no browser auth event fires.
  }, [pathname]);

  if (state === "unknown") return <span className="s-nav-auth" aria-hidden />;
  if (state === "out") return <Link href="/sign-in" className="s-nav-auth">Sign in</Link>;
  return (
    <>
      {owner && <Link href="/admin/orders" className="s-nav-auth" style={{ textDecoration: "none" }}>Admin</Link>}
      <Link href="/account" className="s-nav-auth" style={{ textDecoration: "none" }}>Account</Link>
      <form action={signOutAction} className="s-nav-signout">
        <button type="submit" className="s-nav-cart">Sign out</button>
      </form>
    </>
  );
}
