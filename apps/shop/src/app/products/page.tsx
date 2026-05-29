import ProductCard from "@/components/ProductCard";
import { products, categories } from "@/data/products";

export const metadata = {
  title: "Research Peptides — Aura Protocols",
  description: "Browse our curated catalog of high-purity research peptides from verified affiliate vendors.",
};

export default function ProductsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">Catalog</p>
        <h1 className="text-4xl font-extrabold text-white mb-4">Research Compounds</h1>
        <p className="text-slate-400 max-w-xl leading-relaxed">
          Every product below links to a vetted affiliate vendor. Purity certificates are available from each supplier. For research use only.
        </p>
      </div>

      {categories.map((cat) => (
        <section key={cat} className="mb-16">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-1 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-violet-500" />
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
  );
}
