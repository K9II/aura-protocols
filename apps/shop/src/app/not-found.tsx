import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pharmacopoeia">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <p className="s-micro s-eyebrow">404 · Page not found</p>
        <h1 className="s-h1 mb-6">Nothing on <em>this shelf.</em></h1>
        <p className="text-[15.5px] leading-relaxed text-[color:var(--ink-soft)] mb-8 max-w-[52ch]">
          The page you were looking for has moved or never existed. Every compound we carry is in the catalog, and every
          certificate is on the COA lookup.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/products" className="p-btn-primary inline-block px-5 py-3 text-sm uppercase tracking-[0.06em]">Browse the catalog →</Link>
          <Link href="/coa" className="p-btn-outline inline-block px-5 py-3 text-sm uppercase tracking-[0.06em]">COA lookup</Link>
        </div>
      </div>
    </div>
  );
}
