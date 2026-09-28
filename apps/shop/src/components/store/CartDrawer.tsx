"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/components/store/CartProvider";
import CartView from "@/components/store/CartView";
import { useFocusTrap } from "@/components/store/useFocusTrap";

export default function CartDrawer() {
  const { open, setOpen } = useCart();
  const asideRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      closeButtonRef.current?.focus();
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
      previouslyFocusedRef.current = null;
    }
  }, [open]);

  useFocusTrap(asideRef, open);

  if (!open) return null;
  return (
    <>
      <div className="s-drawer-backdrop" onClick={() => setOpen(false)} />
      <aside ref={asideRef} className="pharmacopoeia s-drawer" role="dialog" aria-modal="true" aria-label="Cart">
        <div className="flex justify-between items-center px-6 py-5 border-b border-[color:var(--line)]">
          <h2 className="p-serif text-2xl">Your cart</h2>
          <button ref={closeButtonRef} type="button" onClick={() => setOpen(false)} aria-label="Close cart" className="bg-transparent border-0 text-2xl cursor-pointer">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <CartView onNavigate={() => setOpen(false)} />
        </div>
        <div className="px-6 py-4 border-t border-[color:var(--line)]">
          <Link href="/cart" onClick={() => setOpen(false)} className="p-see-all s-micro">View full cart →</Link>
        </div>
      </aside>
    </>
  );
}
