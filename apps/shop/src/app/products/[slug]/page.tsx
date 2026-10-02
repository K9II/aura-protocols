import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { compounds } from "@/data/catalog";
import { findCompound, fromPackPriceUsd, isPendingLot, relatedCompounds, toPackPriceUsd, vialLabel } from "@/lib/catalog";
import Vial from "@/components/store/Vial";
import SpecBoxes from "@/components/store/SpecBoxes";
import VariantPicker from "@/components/store/VariantPicker";
import CompoundCard from "@/components/store/CompoundCard";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";

const BASE_URL = "https://auraprotocols.com";

export function generateStaticParams() {
  return compounds.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = findCompound(slug);
  if (!c) return {};
  const description = c.description
    ?? `${c.name} — ${c.chemicalClass}. Lot-tested research compound with certificate of analysis. For research use only.`;
  return {
    title: c.name,
    description,
    alternates: { canonical: `/products/${c.slug}` },
    openGraph: { title: `${c.name} — Aura Protocols`, description, url: `${BASE_URL}/products/${c.slug}`, images: [{ url: `/products/${c.slug}/opengraph-image`, width: 1200, height: 630, alt: c.name }] },
    twitter: { card: "summary_large_image", title: `${c.name} — Aura Protocols`, description, images: [`/products/${c.slug}/opengraph-image`] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = findCompound(slug);
  if (!c) notFound();
  const lot = c.currentLot;
  const pending = isPendingLot(lot);
  const strengths = c.variants.map((v) => v.strength.replace(/\s/g, " ")).join(" / ");
  const componentNames = (c.components ?? [])
    .map((s) => findCompound(s)?.name)
    .filter((n): n is string => Boolean(n));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: c.name,
    description: c.description,
    category: c.chemicalClass,
    url: `${BASE_URL}/products/${c.slug}`,
    brand: { "@type": "Brand", name: "Aura Protocols" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: fromPackPriceUsd(c),
      highPrice: toPackPriceUsd(c),
      availability: c.variants.some((v) => v.stock !== "out") ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const rows: Array<[string, string | undefined, boolean?]> = [
    ["CAS No.", c.identity.cas],
    ["Formula", c.identity.formula],
    ["Mol. weight", c.identity.molecularWeight],
    ["Sequence", c.identity.sequence, true],
    ["Components", componentNames.length ? componentNames.join(" · ") : undefined],
    ["Form", c.form],
    ["Storage", c.storage],
  ];

  return (
    <div className="pharmacopoeia">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="p-container">
        <section className="s-pdp" style={{ borderBottom: "none" }}>
          <div className="s-ghost" aria-hidden>{c.name}</div>
          <div className="s-media">
            {!pending && lot.coaFile && <span className="s-coa-tag">◇ COA on file</span>}
            <Vial id={`pdp-${c.slug}`} label={vialLabel(c)} strength={c.variants[0].strength} tilt={-12} width={270} />
          </div>
          <div className="relative">
            <p className="s-micro text-[color:var(--ink-soft)] mb-3.5">
              <Link href={`/products?cat=${encodeURIComponent(c.chemicalClass)}`}>{c.chemicalClass}</Link> · {c.vialMl} mL vial · {strengths}
            </p>
            <h1 className="s-pdp-h1">{c.name}</h1>
            <SpecBoxes lot={lot} />
            {!pending && lot.coaFile ? (
              <a className="s-certlink" href={lot.coaFile} target="_blank" rel="noopener noreferrer">◇ View this lot&apos;s certificate</a>
            ) : (
              <p className="s-certlink" style={{ borderBottom: "none" }}>◇ Certificate posted when lab results return</p>
            )}
            <VariantPicker compound={c} />
            <div className="s-ship"><b>Ships from the US</b>Tracked shipping · free on orders of ${FREE_SHIPPING_THRESHOLD_USD} or more</div>
            <p className="s-micro s-ruo">For research use only · Not for human consumption · 21+</p>
          </div>
        </section>

        <section className="s-data">
          <div>
            <h2 className="s-h2">Compound <em>data</em></h2>
            <p>Identity and handling information for this material. The lot certificate is the authority for the vial you receive.</p>
            {c.identity.source && (
              <a className="p-link text-xs" href={c.identity.source} target="_blank" rel="noopener noreferrer">Identity source ↗</a>
            )}
          </div>
          <table>
            <tbody>
              {rows.filter(([, v]) => v).map(([k, v, mono]) => (
                <tr key={k}><td className="s-micro">{k}</td><td className={mono ? "s-mono" : undefined}>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="py-11 border-t border-[color:var(--line)]">
          <h2 className="s-h2 mb-6">Researchers also <em>added</em></h2>
          <div className="s-grid">
            {relatedCompounds(c, 4).map((r, i) => <CompoundCard key={r.slug} compound={r} index={i} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
