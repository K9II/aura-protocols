"use client";
import Link from "next/link";
import { useState } from "react";
import AuraMark from "@/components/AuraMark";
import { SHOP_URL } from "@/lib/constants";

const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Connect", href: "/connect" },
  { label: "Demo", href: "/demo" },
  { label: "Shop", href: SHOP_URL },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="pharmacopoeia sticky top-0 z-50">
      <nav className="p-top">
        <div className="p-container flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Aura Protocols home">
            <AuraMark size={36} mode="once" />
            <span className="p-serif-italic text-[21px] tracking-tight">Aura Protocols</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <div className="p-navlinks flex gap-[30px] text-[12.5px] tracking-[0.08em] uppercase text-[color:var(--ink-soft)]">
              {links.map((l) => (
                <Link key={l.href} href={l.href}>{l.label}</Link>
              ))}
            </div>
            <Link href="/connect" className="p-nav-cta text-xs tracking-[0.06em] uppercase bg-[color:var(--ink)] text-[color:var(--paper)] px-4 py-2.5">
              Connect
            </Link>
          </div>
          <button className="md:hidden text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </nav>
      {open && (
        <div className="md:hidden border-t border-[color:var(--line)] bg-[color:var(--paper)] px-[28px] py-4 flex flex-col gap-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
