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
        {/* Each phrase is nowrap so narrow screens wrap between phrases, not inside one. */}
        <span className="whitespace-nowrap">Tested before sale</span> · <span className="whitespace-nowrap">COA per lot</span> ·{" "}
        <em className="whitespace-nowrap">Ships from the US</em> · <span className="whitespace-nowrap">Free over ${FREE_SHIPPING_THRESHOLD_USD}</span>
      </div>
      <div className="p-container pt-3.5 pb-2 bg-[color:var(--paper)]">
        {/* Logo left · links centered · Shop + Cart right (Kearney, option A, 2026-09-28).
            Phones: logo + actions on one row, links centered on a second row. */}
        <nav className="s-nav" aria-label="Main">
          <Link href="/" aria-label="Aura Protocols home" className="s-nav-logo"><AuraLockup size={58} mode="loop" /></Link>
          <div className="s-nav-links">
            <Link href="/coa">COA Lookup</Link>
            <Link href="/wholesale">Wholesale</Link>
            <Link href="/affiliates">Affiliates</Link>
          </div>
          <div className="s-nav-actions">
            <Link href="/products" className="s-nav-shop">Shop</Link>
            <button type="button" className="s-nav-cart" onClick={() => setOpen(true)}>
              Cart ({totals.itemCount})
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
