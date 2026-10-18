"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { useOwner, useSessionState } from "@/components/store/AuthLinks";

// Phones only (CSS shows it under 641px): the header's menu button. The links row and the
// account links live here so the pinned header is one slim row (mock 2026-10-17,
// https://claude.ai/artifact/Tbn4wSqggmTs7gTWoGSVgZ). Closes on a page change, Escape, a tap
// outside, or choosing a link.
export default function PhoneMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const state = useSessionState();
  const owner = useOwner(state);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const tap = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", tap);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", tap); };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <div className="s-pmenu" ref={wrap}>
      <button type="button" className={`s-pmenu-btn${open ? " is-open" : ""}`} aria-expanded={open} aria-controls="phone-menu" aria-label={open ? "Close menu" : "Menu"} onClick={() => setOpen(!open)}>
        <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden><path d={open ? "M3 0l14 14M17 0L3 14" : "M0 1h20M0 7h20M0 13h20"} stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>
      </button>
      {open && (
        <nav id="phone-menu" className="s-pmenu-panel" aria-label="Menu">
          <Link href="/products" className="s-pmenu-shop" onClick={close}>Shop</Link>
          <Link href="/coa" onClick={close}>COA Lookup</Link>
          <Link href="/wholesale" onClick={close}>Wholesale</Link>
          <Link href="/affiliates" onClick={close}>Affiliate Program</Link>
          {state === "out" && <Link href="/sign-in" onClick={close}>Sign in</Link>}
          {state === "in" && <>
            <Link href="/account" onClick={close}>Account</Link>
            {owner && <Link href="/admin/orders" onClick={close}>Admin</Link>}
            <form action={signOutAction}><button type="submit">Sign out</button></form>
          </>}
        </nav>
      )}
    </div>
  );
}
