import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Brand */}
        <div>
          <p className="font-bold text-lg mb-2">
            Aura <span className="gradient-brand">Protocols</span>
          </p>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your trusted guide to research peptides. We partner with the most reputable suppliers to bring you verified products and honest information.
          </p>
        </div>

        {/* Links */}
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-semibold">Explore</p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/products" className="hover:text-white transition-colors">All Products</Link></li>
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
