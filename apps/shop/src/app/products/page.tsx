import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { products, categories } from "@/data/products";

export const metadata = {
  title: "Research Peptides — Aura Protocols",
  description: "Browse our curated catalog of high-purity research peptides from verified vendors.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const visibleCategories = category ? categories.filter((cat) => cat === category) : categories;

  return (
    <div className="pharmacopoeia">
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">Catalog</p>
        <h1 className="p-serif text-4xl mb-4 text-[color:var(--ink)]">Research Compounds</h1>
        <p className="text-[color:var(--ink-soft)] max-w-xl leading-relaxed">
          Every product below links to a vetted vendor. Purity certificates are available from each supplier. For research use only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-12">
        <Link
          href="/products"
          className={`p-chip ${!category ? "border-[color:var(--specimen)] text-[color:var(--specimen)]" : ""}`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat}
            href={`/products?category=${encodeURIComponent(cat)}`}
            className={`p-chip ${category === cat ? "border-[color:var(--specimen)] text-[color:var(--specimen)]" : ""}`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {visibleCategories.map((cat) => (
        <section key={cat} className="mb-16">
          <h2 className="p-serif text-xl mb-6 flex items-center gap-3 text-[color:var(--ink)]">
            <span className="w-1 h-6 bg-[color:var(--specimen)]" />
            {cat}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products
              .filter((p) => p.category === cat)
              .map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </section>
      ))}
    </div>
    </div>
  );
}
