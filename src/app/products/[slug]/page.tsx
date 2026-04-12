import { notFound } from "next/navigation";
import Link from "next/link";
import { products } from "@/data/products";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) return {};
  return {
    title: `${product.name} — Aura Protocols`,
    description: product.description,
  };
}

const categoryColors: Record<string, string> = {
  Recovery: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "Weight Management": "text-rose-400 bg-rose-400/10 border-rose-400/20",
  "Growth & Performance": "text-violet-400 bg-violet-400/10 border-violet-400/20",
  Wellness: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
};

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  const related = products.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 2);

  const colorClass = categoryColors[product.category] ?? "text-slate-400 bg-slate-400/10 border-slate-400/20";

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-10">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-white transition-colors">Products</Link>
        <span>/</span>
        <span className="text-slate-300">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Main content */}
        <div className="md:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colorClass}`}>
                {product.category}
              </span>
              {product.badge && <span className="badge">{product.badge}</span>}
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-4">{product.name}</h1>
            <p className="text-slate-400 leading-relaxed text-lg">{product.description}</p>
          </div>

          {/* Benefits */}
          <div className="glass p-6">
            <h2 className="text-sm uppercase tracking-widest text-cyan-400 font-semibold mb-4">Studied Benefits</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Research disclaimer */}
          <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-5">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">Research Use Only</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              This compound is intended for laboratory and research purposes only. It is not approved for human consumption and is not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified healthcare professional.
            </p>
          </div>
        </div>

        {/* Sidebar — Purchase CTA */}
        <div className="space-y-4">
          <div className="glass p-6 glow-cyan sticky top-24">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">Recommended Vendor</p>
            <p className="text-lg font-bold text-white mb-1">{product.affiliate.vendor}</p>
            <p className="text-sm text-emerald-400 font-semibold mb-5">{product.affiliate.commission} affiliate commission</p>

            <a
              href={product.affiliate.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="btn-primary w-full text-center text-sm py-3 block"
            >
              Buy from {product.affiliate.vendor} →
            </a>

            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Affiliate link — Aura Protocols earns a commission at no extra cost to you. We only recommend vendors we trust.
            </p>
          </div>

          {/* Trust badges */}
          <div className="glass p-5 space-y-3">
            {[
              { icon: "✓", label: "COA Verified Vendor" },
              { icon: "✓", label: "HPLC Purity Tested" },
              { icon: "✓", label: "Third-Party Tested" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-emerald-400/10 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {item.icon}
                </span>
                <span className="text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="text-xl font-bold text-white mb-6">Related in {product.category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/products/${r.slug}`}
                className="glass product-card p-5 block"
              >
                <p className="font-bold text-white mb-1">{r.name}</p>
                <p className="text-sm text-slate-400 line-clamp-2">{r.description}</p>
                <p className="text-xs text-cyan-400 font-semibold mt-3">View product →</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
