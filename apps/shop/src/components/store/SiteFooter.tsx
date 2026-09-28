import Link from "next/link";
import AuraLockup from "@/components/AuraLockup";
import { classCounts } from "@/lib/catalog";
import { SUPPORT_EMAIL } from "@/lib/constants";

export default function SiteFooter() {
  return (
    <footer className="pharmacopoeia border-t border-[color:var(--line)]">
      <div className="p-container py-14 grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <AuraLockup size={70} mode="static" />
          <p className="text-[13.5px] text-[color:var(--ink-soft)] mt-5 max-w-[30ch]">
            Research-grade peptides. No lot is sold until an independent lab has tested it and its certificate is on the page.
          </p>
        </div>
        <div>
          <h6 className="s-micro text-[color:var(--ink-soft)] mb-3.5">Shop</h6>
          <ul className="text-[13.5px] space-y-2.5">
            <li><Link href="/products">All compounds</Link></li>
            {classCounts().map(({ cls }) => (
              <li key={cls}><Link href={`/products?cat=${encodeURIComponent(cls)}`}>{cls}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h6 className="s-micro text-[color:var(--ink-soft)] mb-3.5">Company</h6>
          <ul className="text-[13.5px] space-y-2.5">
            <li><Link href="/about">About</Link></li>
            <li><Link href="/quality-standards">Quality Standards</Link></li>
            <li><Link href="/coa">COA Lookup</Link></li>
            <li><Link href="/wholesale">Wholesale</Link></li>
            <li><Link href="/affiliates">Affiliates</Link></li>
            <li><a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a></li>
          </ul>
        </div>
        <div>
          <h6 className="s-micro text-[color:var(--ink-soft)] mb-3.5">Legal</h6>
          <ul className="text-[13.5px] space-y-2.5">
            <li><Link href="/terms">Terms of Service</Link></li>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/shipping">Shipping</Link></li>
            <li><Link href="/refund-policy">Refund &amp; Dispute Policy</Link></li>
            <li><Link href="/ruo">Research Use Only</Link></li>
          </ul>
        </div>
      </div>
      <div className="p-container pb-10">
        <p className="s-micro text-[color:var(--specimen)] mb-3">For research use only · Not for human consumption · 21+</p>
        <p className="text-[11.5px] leading-relaxed text-[color:var(--ink-soft)] border-t border-[color:var(--line)] pt-4">
          Aura Protocols supplies research compounds for in-vitro laboratory research only. Products are not drugs, supplements, or cosmetics; they are not approved by the FDA and are not intended to diagnose, treat, cure, or prevent any disease. © {new Date().getFullYear()} Aura Protocols LLC.
        </p>
      </div>
    </footer>
  );
}
