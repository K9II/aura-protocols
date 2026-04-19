import Link from "next/link";

const socials = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/auraprotocols",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "X / Twitter",
    href: "https://x.com/auraprotocols",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@auraprotocols",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.73a8.27 8.27 0 004.84 1.56V6.84a4.85 4.85 0 01-1.07-.15z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Brand */}
        <div>
          <p className="font-bold text-lg mb-2">
            Aura <span className="gradient-brand">Protocols</span>
          </p>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            Your trusted guide to research peptides. We partner with the most reputable suppliers to bring you verified products and honest information.
          </p>
          {/* Social links */}
          <div className="flex items-center gap-3">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className="text-slate-500 hover:text-cyan-400 transition-colors"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Links */}
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-semibold">Explore</p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/products" className="hover:text-white transition-colors">All Products</Link></li>
            <li><Link href="/compare" className="hover:text-white transition-colors">Vendor Comparisons</Link></li>
            <li><Link href="/blog" className="hover:text-white transition-colors">Research Blog</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
          </ul>
        </div>

        {/* Disclosure */}
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-semibold">Disclosure</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Aura Protocols participates in affiliate programs. We may earn a commission when you purchase through our links at no additional cost to you. All products are for research purposes only and are not intended to diagnose, treat, cure, or prevent any disease.
          </p>
        </div>
      </div>

      <div className="border-t border-white/5 max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex gap-6">
          <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Terms of Service
          </Link>
        </div>
        <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Aura Protocols. All rights reserved.</p>
      </div>
    </footer>
  );
}
