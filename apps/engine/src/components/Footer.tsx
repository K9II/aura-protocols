import Link from "next/link";
import { SHOP_URL } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="pharmacopoeia p-foot border-t border-[color:var(--line)] pt-16">
      <div className="p-container py-12">
        <div className="grid gap-[30px] mb-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <p className="p-serif-italic text-lg mb-3">Aura Protocols</p>
            <p className="text-[13px] text-[color:var(--ink-soft)] max-w-[36ch] mb-2">
              A wearable-personalized protocol engine — biometric readings in, research-grade protocol out.
            </p>
            <p className="text-[11.5px] text-[color:var(--ink-faint)] max-w-[36ch] mb-5">
              Educational only. Not medical advice.
            </p>
          </div>
          <div>
            <h6 className="text-[11px] tracking-[0.1em] uppercase text-[color:var(--ink-soft)] mb-3.5">Engine</h6>
            <ul className="text-[13.5px] space-y-2.5 text-[color:var(--ink-soft)]">
              <li><Link href="/connect" className="hover:text-[color:var(--ink)]">Connect a wearable</Link></li>
              <li><Link href="/dashboard" className="hover:text-[color:var(--ink)]">Dashboard</Link></li>
              <li><Link href="/demo" className="hover:text-[color:var(--ink)]">Demo</Link></li>
              <li><a href={SHOP_URL} className="hover:text-[color:var(--ink)]">Shop</a></li>
            </ul>
          </div>
          <div>
            <h6 className="text-[11px] tracking-[0.1em] uppercase text-[color:var(--ink-soft)] mb-3.5">Company</h6>
            <ul className="text-[13.5px] space-y-2.5 text-[color:var(--ink-soft)]">
              <li><a href="mailto:support@auraprotocols.com" className="hover:text-[color:var(--ink)]">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[color:var(--line)] pt-5 text-[11.5px] leading-relaxed text-[color:var(--ink-soft)]">
          The Engine produces educational protocol suggestions from biometric fitness data — never PHI. Not medical advice; medical judgment requires a licensed clinician. &copy; {new Date().getFullYear()} Aura Protocols.
        </div>
      </div>
    </footer>
  );
}
