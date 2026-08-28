import { notFound } from "next/navigation";
import Link from "next/link";
import { products } from "@/data/products";
import { vendorPins, vendorDemotions } from "@/data/vendorOrder";
import EngineCTACard from "@/components/EngineCTACard";
import VendorCompareList from "@/components/VendorCompareList";
import { PRODUCT_GUIDES } from "@/lib/guides";
import { isSpecimenBadge } from "@/lib/badges";

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
    openGraph: {
      title: `${product.name} — Aura Protocols`,
      description: product.description,
      url: `https://auraprotocols.com/products/${product.slug}`,
      images: [{ url: `/products/${product.slug}/opengraph-image`, width: 1200, height: 630, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — Aura Protocols`,
      description: product.description,
      images: [`/products/${product.slug}/opengraph-image`],
    },
  };
}

const BASE_URL = "https://auraprotocols.com";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  const related = products.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 2);

  // Vendor display order: demoted vendors (under review) always sink to the
  // bottom; then GLP-1 products pin Evolve, other products pin American; the
  // rest fall back to commission-desc. See data/vendorOrder.ts.
  const pins = vendorPins(product.id);
  const demotions = vendorDemotions();
  const sortedVendors = [...product.vendors].sort((a, b) => {
    const da = demotions.indexOf(a.vendor);
    const db = demotions.indexOf(b.vendor);
    const aDemoted = da !== -1;
    const bDemoted = db !== -1;
    // Demoted vendors always sort after non-demoted ones, regardless of pins.
    if (aDemoted !== bDemoted) return aDemoted ? 1 : -1;
    if (aDemoted && bDemoted) return da - db;

    const pa = pins.indexOf(a.vendor);
    const pb = pins.indexOf(b.vendor);
    if (pa !== -1 || pb !== -1) {
      if (pa === -1) return 1;
      if (pb === -1) return -1;
      return pa - pb;
    }
    const parse = (c: string) => parseFloat(c) || -1;
    return parse(b.commission) - parse(a.commission);
  });

  const guideHref = PRODUCT_GUIDES[product.slug];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    category: product.category,
    url: `${BASE_URL}/products/${product.slug}`,
    brand: { "@type": "Brand", name: "Aura Protocols" },
    offers: product.vendors.map((v) => ({
      "@type": "Offer",
      url: v.url,
      seller: { "@type": "Organization", name: v.vendor },
      availability: "https://schema.org/InStock",
    })),
  };

  return (
    <div className="pharmacopoeia">
    <div className="max-w-4xl mx-auto px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[color:var(--ink-soft)] mb-10">
        <Link href="/" className="hover:text-[color:var(--ink)] transition-colors">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[color:var(--ink)] transition-colors">Products</Link>
        <span>/</span>
        <span className="text-[color:var(--ink)]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Main content */}
        <div className="order-2 md:order-1 md:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="p-chip">{product.category}</span>
              {product.badge && <span className={`p-badge${isSpecimenBadge(product.badge) ? " p-badge--specimen" : ""}`}>{product.badge}</span>}
            </div>
            <h1 className="p-serif text-4xl mb-4 text-[color:var(--ink)]">{product.name}</h1>
            <p className="text-[color:var(--ink-soft)] leading-relaxed text-lg">{product.description}</p>
          </div>

          {/* Benefits */}
          <div className="p-card p-6">
            <h2 className="text-sm uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-4">Studied Benefits</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-[color:var(--ink-soft)]">
                  <span className="w-5 h-5 border border-[color:var(--specimen)]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--specimen)]" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Research disclaimer */}
          <div className="p-callout p-5">
            <p className="text-xs font-semibold text-[color:var(--specimen)] uppercase tracking-widest mb-1">Research Use Only</p>
            <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">
              This compound is intended for laboratory and research purposes only. It is not approved for human consumption and is not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified healthcare professional.
            </p>
          </div>

          {guideHref && (
            <Link href={guideHref} className="p-link text-xs flex items-center gap-1.5 px-1">
              Full Research Guide
            </Link>
          )}
        </div>

        {/* Sidebar — Where to Buy */}
        <div className="order-1 md:order-2 space-y-4">
          <div className="bg-[color:var(--paper-deep)] p-6 sticky top-24">
            <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-1">Independently Reviewed</p>
            <p className="text-xs text-[color:var(--ink-soft)] mb-5 leading-relaxed">
              We only list vendors that provide third-party, batch-specific COAs.
            </p>
            <VendorCompareList vendors={sortedVendors} productSlug={product.slug} />
            <p className="text-xs text-[color:var(--ink-soft)] mt-5 pt-4 border-t border-[color:var(--line)] leading-relaxed">
              Affiliate disclosure: links above are affiliate partnerships. We may earn a commission at no cost to you.
            </p>
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="p-serif text-xl mb-6 text-[color:var(--ink)]">Related in {product.category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/products/${r.slug}`}
                className="p-card block p-5"
              >
                <p className="font-semibold text-[color:var(--ink)] mb-1">{r.name}</p>
                <p className="text-sm text-[color:var(--ink-soft)] line-clamp-2">{r.description}</p>
                <p className="text-xs text-[color:var(--specimen)] font-semibold mt-3">View product →</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <EngineCTACard />
    </div>
    </div>
  );
}
