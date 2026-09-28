"use client";

import Link from "next/link";
import AuraLockup from "@/components/AuraLockup";
import { useCart } from "@/components/store/CartProvider";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";

export default function SiteNav() {
  const { totals, setOpen } = useCart();
  return (
    <header className="pharmacopoeia sticky top-0 z-50">
      <div className="s-topbar">
        Tested before sale · COA per lot · <em>Ships from the US</em> · Free over ${FREE_SHIPPING_THRESHOLD_USD}
      </div>
      <div className="p-container pt-3.5 pb-2 bg-[color:var(--paper)]">
        <nav className="s-nav" aria-label="Main">
          <Link href="/products" className="s-nav-shop">Shop</Link>
          <div className="s-nav-mid">
            <Link href="/" aria-label="Aura Protocols home"><AuraLockup size={44} mode="loop" /></Link>
            <div className="s-nav-links">
              <Link href="/coa">COA Lookup</Link>
              <Link href="/wholesale">Wholesale</Link>
              <Link href="/affiliates">Affiliates</Link>
            </div>
          </div>
          <button type="button" className="s-nav-cart" onClick={() => setOpen(true)}>
            Cart ({totals.itemCount})
          </button>
        </nav>
      </div>
    </header>
  );
}
