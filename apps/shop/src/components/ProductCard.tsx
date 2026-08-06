import Link from "next/link";
import type { Product } from "@/data/products";
import { learnMoreHref } from "@/lib/guides";
import { isSpecimenBadge } from "@/lib/badges";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="pharmacopoeia p-card p-6 flex flex-col gap-4 relative">
      {product.badge && (
        <span className={`p-badge absolute top-4 right-4 ${isSpecimenBadge(product.badge) ? "p-badge--specimen" : ""}`}>{product.badge}</span>
      )}

      {/* Category */}
      <span className="p-cat-label">{product.category}</span>

      {/* Name & description */}
      <div>
        <Link href={`/products/${product.slug}`} className="hover:text-[color:var(--specimen)] transition-colors">
          <h3 className="p-serif text-lg text-[color:var(--ink)] mb-1">{product.name}</h3>
        </Link>
        <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed line-clamp-3">{product.description}</p>
      </div>

      {/* Benefits */}
      <ul className="space-y-1">
        {product.benefits.slice(0, 3).map((b) => (
          <li key={b} className="flex items-center gap-2 text-xs text-[color:var(--ink-soft)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--specimen)] flex-shrink-0" />
            {b}
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-[color:var(--line)]">
        <Link href={learnMoreHref(product.slug)} className="text-xs text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] transition-colors">
          Learn more →
        </Link>
        <Link href={`/products/${product.slug}`} className="p-btn-primary text-xs py-2 px-4">
          Buy Now
        </Link>
      </div>
    </div>
  );
}
