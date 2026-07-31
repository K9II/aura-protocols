import Link from "next/link";
import { categories } from "@/data/products";

const socials = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/auraprotocols",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "X / Twitter",
    href: "https://x.com/aura_protocols",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@auraprotocols",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.73a8.27 8.27 0 004.84 1.56V6.84a4.85 4.85 0 01-1.07-.15z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="pharmacopoeia p-foot border-t border-[color:var(--line)]">
      <div className="p-container py-12">
        <div className="grid gap-[30px] mb-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <p className="p-serif-italic text-lg mb-3">Aura Protocols</p>
            <p className="text-[13px] text-[color:var(--ink-soft)] max-w-[32ch] mb-5">
              An independent, editorially-reviewed index of research peptides — matched to your data, verified to
              the batch.
            </p>
            <div className="flex items-center gap-3.5">
              {socials.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="text-[color:var(--ink-soft)] hover:text-[color:var(--specimen)] transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Index */}
          <div>
            <h6 className="text-[11px] tracking-[0.1em] uppercase text-[color:var(--ink-soft)] mb-3.5">Index</h6>
            <ul className="text-[13.5px] space-y-2.5">
              {categories.map((cat) => (
                <li key={cat} className="text-[color:var(--ink-soft)]">
                  <Link href="/products" className="hover:text-[color:var(--ink)] transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Blog */}
          <div>
            <h6 className="text-[11px] tracking-[0.1em] uppercase text-[color:var(--ink-soft)] mb-3.5">Blog</h6>
            <ul className="text-[13.5px] space-y-2.5">
              <li className="text-[color:var(--ink-soft)]">
                <Link href="/blog" className="hover:text-[color:var(--ink)] transition-colors">All Articles</Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h6 className="text-[11px] tracking-[0.1em] uppercase text-[color:var(--ink-soft)] mb-3.5">Company</h6>
            <ul className="text-[13.5px] space-y-2.5">
              <li className="text-[color:var(--ink-soft)]">
                <Link href="/about" className="hover:text-[color:var(--ink)] transition-colors">About</Link>
              </li>
              <li className="text-[color:var(--ink-soft)]">
                <a href="mailto:support@auraprotocols.com" className="hover:text-[color:var(--ink)] transition-colors">Contact</a>
              </li>
              <li className="text-[color:var(--ink-soft)]">
                <Link href="/privacy" className="hover:text-[color:var(--ink)] transition-colors">Privacy Policy</Link>
              </li>
              <li className="text-[color:var(--ink-soft)]">
                <Link href="/terms" className="hover:text-[color:var(--ink)] transition-colors">Terms of Service</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[color:var(--line)] pt-5 text-[11.5px] leading-relaxed text-[color:var(--ink-soft)]">
          Aura Protocols is an independent, editorially-reviewed index. We are not a compounding pharmacy or an
          outsourcing facility. All compounds referenced are for laboratory research use only and are not approved
          for human consumption. Affiliate disclosure: some links are affiliate partnerships; we may earn a
          commission at no cost to you. &copy; {new Date().getFullYear()} Aura Protocols.
        </div>
      </div>
    </footer>
  );
}
