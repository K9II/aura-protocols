"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import AuraLockup from "@/components/AuraLockup";
import AuthLinks from "@/components/store/AuthLinks";
import PhoneMenu from "@/components/store/PhoneMenu";
import SiteSearch from "@/components/store/SiteSearch";
import { useCart } from "@/components/store/CartProvider";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";
import { useLotNews } from "@/lib/lot-news";

export default function SiteNav() {
  const { totals, setOpen } = useCart();
  const pathname = usePathname();
  const news = useLotNews();
  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // Phones: the banner scrolls away and only the slim menu row stays pinned — the header
  // sticks at minus the banner's height (measured, since lot news can make it taller).
  useEffect(() => {
    const header = headerRef.current, bar = barRef.current;
    if (!header || !bar || typeof window.matchMedia !== "function") return;
    const phone = window.matchMedia("(max-width: 640px)");
    const place = () => { header.style.top = phone.matches ? `-${bar.getBoundingClientRect().height}px` : ""; };
    place();
    const sized = typeof ResizeObserver === "function" ? new ResizeObserver(place) : null;
    sized?.observe(bar);
    phone.addEventListener("change", place);
    return () => { sized?.disconnect(); phone.removeEventListener("change", place); };
  }, [pathname]);
  if (pathname?.startsWith("/admin")) return null;
  // Returning visitor with lots released since their last visit (set by the home lot record).
  const [newsLead, ...newsItems] = news ? news.split(" · ") : [];
  return (
    <header ref={headerRef} className="pharmacopoeia sticky top-0 z-50">
      <div ref={barRef} className="s-topbar">
        {news ? (
          <span>
            <em>{newsLead}</em>
            {newsItems.map((t) => <span key={t}>{" · "}<span className="whitespace-nowrap">{t}</span></span>)}
            {/* the free-shipping line rides along with the news (Alvester 2026-10-22: in place of "COA on every lot") */}
            {" · "}<span className="whitespace-nowrap">Free shipping over ${FREE_SHIPPING_THRESHOLD_USD}</span>
          </span>
        ) : <>
        {/* Narrow screens wrap between phrases; each dot stays at the end of the
            phrase before it, so no line starts with one. Phones get the short
            wording so the bar is two lines, not four (2026-10-10). "Testing includes" (2026-10-18):
            stays true if the seven-point panel is split across labs. */}
        <span className="s-topbar-wide">
          <span>Testing includes ISO/IEC 17025-accredited US lab ·</span>{" "}
          <span className="whitespace-nowrap">COA on every lot ·</span>{" "}
          <span className="whitespace-nowrap"><em>Fast domestic shipping</em> ·</span>{" "}
          <span className="whitespace-nowrap">Free over ${FREE_SHIPPING_THRESHOLD_USD}</span>
        </span>
        <span className="s-topbar-phone">
          <span className="whitespace-nowrap">Testing includes accredited US lab ·</span>{" "}
          <span className="whitespace-nowrap">COA every lot ·</span>{" "}
          <span className="whitespace-nowrap"><em>Free shipping over ${FREE_SHIPPING_THRESHOLD_USD}</em></span>
        </span>
        </>}
      </div>
      <div className="p-container s-nav-wrap pt-3.5 pb-2 bg-[color:var(--paper)]">
        {/* Logo left · links centered (Shop first, 2026-10-09) · account + Cart right.
            Phones (2026-10-17): one slim row — logo, search, Cart, menu; the links and
            account live in the menu (PhoneMenu). */}
        <nav className="s-nav" aria-label="Main">
          <Link href="/" aria-label="Aura Protocols home" className="s-nav-logo"><AuraLockup size={58} mode="loop" /></Link>
          <div className="s-nav-links">
            <Link href="/products" className="s-nav-shop-link">Shop</Link>
            <Link href="/coa">COA Lookup</Link>
            <Link href="/wholesale">Wholesale</Link>
            <Link href="/affiliates">Affiliate Program</Link>
          </div>
          <div className="s-nav-actions">
            <SiteSearch />
            <AuthLinks />
            <button type="button" className={totals.itemCount > 0 ? "s-nav-cart s-nav-cart-full" : "s-nav-cart"} onClick={() => setOpen(true)}>
              Cart ({totals.itemCount})
            </button>
            <PhoneMenu />
          </div>
        </nav>
      </div>
    </header>
  );
}
