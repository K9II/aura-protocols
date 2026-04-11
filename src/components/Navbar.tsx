"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { label: "Products", href: "/products" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-white font-black text-sm">
            A
          </span>
          <span className="font-bold text-lg tracking-tight">
            Aura <span className="gradient-brand">Protocols</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/products" className="btn-primary text-sm py-2 px-4">
            Shop Now
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-slate-400 hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass border-t border-white/5 px-6 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/products" className="btn-primary text-sm py-2 px-4 text-center" onClick={() => setOpen(false)}>
            Shop Now
          </Link>
        </div>
      )}
    </header>
  );
}
