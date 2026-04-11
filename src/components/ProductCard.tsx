import Link from "next/link";
import type { Product } from "@/data/products";

export default function ProductCard({ product }: { product: Product }) {

  const categoryColors: Record<string, string> = {
    Recovery: "text-emerald-400 bg-emerald-400/10",
    "Weight Management": "text-rose-400 bg-rose-400/10",
    "Growth & Performance": "text-violet-400 bg-violet-400/10",
    Wellness: "text-cyan-400 bg-cyan-400/10",
  };

  return (
    <div className="glass product-card p-6 flex flex-col gap-4 relative">
      {product.badge && (
        <span className="badge absolute top-4 right-4">{product.badge}</span>
      )}

      {/* Category */}
      <span
        className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${
          categoryColors[product.category] ?? "text-slate-400 bg-slate-400/10"
        }`}
      >
        {product.category}
      </span>

      {/* Name & description */}
      <div>
        <Link href={`/products/${product.slug}`} className="hover:text-cyan-400 transition-colors">
          <h3 className="text-lg font-bold text-white mb-1">{product.name}</h3>
        </Link>
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{product.description}</p>
      </div>

      {/* Benefits */}
      <ul className="space-y-1">
        {product.benefits.slice(0, 3).map((b) => (
          <li key={b} className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
            {b}
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
        <Link href={`/products/${product.slug}`} className="text-xs text-cyan-400 font-semibold hover:underline">
          Learn more →
        </Link>
        <a
          href={product.affiliate.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="btn-primary text-xs py-2 px-4"
        >
          Buy Now
        </a>
      </div>
    </div>
  );
}
