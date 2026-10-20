import { notFound } from "next/navigation";
import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { Metadata } from "next";
import { catalogContent } from "@/data/catalog";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";
import { findCompound, fromPackPriceUsd, isPendingLot, madeBy, relatedCompounds, toPackPriceUsd, vialCap, vialName, vialParts } from "@/lib/catalog";
import { CLASS_COLOR, classShortName } from "@/lib/class-colors";
import VialTurn, { type VialStrength } from "@/components/store/VialTurn";
import PlacardScan from "@/components/store/PlacardScan";
import QrNote from "@/components/store/QrNote";
import { coaLookupQrUrl, lotQrUrl, qrRows } from "@/lib/vial-qr";
import Unavailable from "@/components/store/Unavailable";
import VariantPicker from "@/components/store/VariantPicker";
import LotRecord from "@/components/store/LotRecord";
import ResearchSummary from "@/components/store/ResearchSummary";
import { currentMs } from "@/lib/clock";
import { productRecord } from "@/lib/lot-record";
import BeforeOrdering, { BeforeOrderingLine } from "@/components/store/BeforeOrdering";
import CompoundCard from "@/components/store/CompoundCard";
import MoleculeViewer from "@/components/store/MoleculeViewer";
import HeroLight from "@/components/store/HeroLight";
import MoleculeGrid from "@/components/store/MoleculeGrid";
import { ELEMENT_COLORS, ELEMENT_NAMES, legendElements, structureCaption, structurePanels } from "@/lib/structure";

const BASE_URL = "https://auraprotocols.com";

// Every content product; hidden ones 404 at render (the live catalog decides).
export function generateStaticParams() {
  return catalogContent.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = catalogContent.find((x) => x.slug === slug);
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

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ rec?: string }> }) {
  // MOCK 2026-10-19: ?rec=a|b|c — three ways to give the Lot record more depth
  const recRaw = (await searchParams)?.rec;
  const recV = recRaw === "b" || recRaw === "c" || recRaw === "now" ? recRaw : "a";
  const { slug } = await params;
  const live = await getLiveCatalogOrNull();
  if (!live) return <Unavailable />;
  const c = findCompound(slug, live.shown);
  if (!c) notFound();
  const hasCertificate = c.variants.some((v) => !isPendingLot(v.lot) && v.lot.coaFile);
  const allOut = c.variants.every((v) => v.stock === "out");
  const anyLow = c.variants.some((v) => v.stock === "low");
  // A blend has no single CAS, formula or weight: its placard lists what it contains.
  // (CJC-1295 / Ipamorelin lists no component pages, so its name gives the parts.)
  const contains = c.components?.length
    ? c.components.map((s) => catalogContent.find((x) => x.slug === s)?.name ?? s)
    : c.name.includes(" / ") ? c.name.split(" / ") : [];
  // Each strength's vial shows its lot (the one selling now, else the last live one) and a QR
  // code to that lot's certificate; before a first lot, "LOT ——" and a code to the lookup.
  // The vial and the placard's scan code follow the size picker.
  const vialStrengths: VialStrength[] = c.variants.map((v) => {
    const lot = isPendingLot(v.lot) ? null : v.lot.lot;
    return { id: v.id, strength: v.strength, lot, qr: qrRows(lot ? lotQrUrl(lot) : coaLookupQrUrl()) };
  });
  const placardRows: Array<[string, ReactNode]> = [
    ["Contains", contains.length ? contains.map((n) => <span key={n} className="s-pdp-part">{n}</span>) : undefined],
    ["CAS", c.identity.cas],
    ["Formula", c.identity.formula],
    ["Mol. wt", c.identity.molecularWeight],
    ["Form", c.form],
  ];
  const strengths = c.variants.map((v) => v.strength.replace(/\s/g, " ")).join(" / ");
  const componentNames = (c.components ?? [])
    .map((s) => catalogContent.find((x) => x.slug === s)?.name)
    .filter((n): n is string => Boolean(n));
  const panels = structurePanels(c.slug);
  const blend = panels.length > 1;
  // Dedupe on the caption text: "pubchem-3d" and "computed" share one caption.
  const captions = [...new Set(panels.map((p) => structureCaption(p.source)))];
  const refLink = (p: (typeof panels)[number]) =>
    p.refLabel ?? (p.source === "crystal-modeled" ? "Crystal structure paper ↗" : p.ref.includes("/compound/") ? `PubChem CID ${p.ref.split("/").pop()} ↗` : "Sequence source ↗");

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
    ["Made by", madeBy(c)],
    ["Storage", c.storage],
  ];

  // The Lot record opens the selected lot's certificate (its tests and links, 2026-10-19).
  const productCerts = live.certificates.filter((x) => x.slug === c.slug);
  return (
    <div className="pharmacopoeia" style={{ "--cls": CLASS_COLOR[c.chemicalClass] } as CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="p-container">
        <section className="s-pdp">
          <div className="s-ghost" aria-hidden>{c.name}</div>
          {/* Monograph placard (approved 2026-10-10): identity card behind an upright
              vial on a raised tile; the tile is slightly see-through so the ghost name shows. */}
          <div className={`s-media s-recv--${recV}`}>
            <div className="s-pdp-tile">
              {hasCertificate && <span className="s-coa-tag">◇ COA on file</span>}
              {allOut ? <span className="s-flag s-flag--out s-micro">Out of stock</span> : anyLow ? <span className="s-flag s-micro">Low stock</span> : null}
              <div className="s-pdp-placard" aria-hidden>
                <span className="s-placard-k">Monograph · {classShortName(c.chemicalClass).split(" ").map((w, i) => <Fragment key={i}>{i ? " " : ""}<span className="whitespace-nowrap">{w}</span></Fragment>)}</span>
                <span className="s-pdp-placard-n">{vialName(c).map((line, i) => <span key={i} className="s-name-line">{line}</span>)}</span>
                <dl>
                  {placardRows.filter(([, v]) => v).map(([k, v]) => <div key={k} className={k === "Form" ? "s-pdp-form" : k === "Mol. wt" ? "s-pdp-mw" : k === "Contains" ? "s-pdp-contains" : undefined}><dt>{k}</dt><dd>{v}</dd></div>)}
                </dl>
                <PlacardScan slug={c.slug} strengths={vialStrengths} />
                <span className="s-placard-r">Research use only · Not for human use</span>
              </div>
              <div className="s-pdp-vial">
                <VialTurn id={`pdp-${c.slug}`} slug={c.slug} label={vialName(c)[0]} label2={vialName(c)[1]} cap={vialCap(c)} rule={CLASS_COLOR[c.chemicalClass]} parts={vialParts(c)} strengths={vialStrengths} />
              </div>
            </div>
            <QrNote slug={c.slug} />
            <LotRecord lots={productRecord(live.lots, c.slug)} variant="product" nowMs={currentMs()} compoundName={c.name} certs={productCerts} />
            <BeforeOrdering where="side" />
          </div>
          <div className="relative">
            <p className="s-micro s-pdp-kick">
              <Link href={`/products?cat=${encodeURIComponent(c.chemicalClass)}`}><i />{c.chemicalClass}</Link><span>· {c.vialMl} mL vial · {strengths}</span>
            </p>
            <h1 className="s-pdp-h1">{c.name}</h1>
            <VariantPicker compound={c} notes={<>
              <p className="s-micro s-ruo">For research use only · Not for human consumption · 21+</p>
              <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-1.5">All products currently listed on this site are for research purposes only.</p>
              <BeforeOrderingLine />
              <BeforeOrdering />
            </>} />
          </div>
        </section>
        {/* MOCK 2026-10-19: tabs to switch the Lot record options */}
        <nav className="s-mock-tabs" aria-label="Lot record options">
          {([["a", "A · Raised card"], ["b", "B · Stacked sheets"], ["c", "C · Instrument plate"], ["now", "Today"]] as const).map(([v, t]) => (
            <Link key={v} href={`/products/${c.slug}?rec=${v}`} scroll={false} className={recV === v ? "is-on" : ""}>{t}</Link>
          ))}
        </nav>
      </div>

      <section className="s-about">
        <HeroLight where="about" />
        <div className="p-container s-about-inner">
          <div>
            <h2 className="s-h2">About this <em>compound</em></h2>
            {c.description && <p className="s-about-desc">{c.description}</p>}
            {captions.map((cap) => <p key={cap} className="s-about-cap">{cap}</p>)}
            {blend && <p className="s-about-cap">Each panel is one component. They are separate molecules, not bonded to each other.</p>}
            <p className="s-micro s-mol-legend">
              {legendElements(panels).map((e) => (
                <span key={e}><i style={{ background: ELEMENT_COLORS[e] }} />{ELEMENT_NAMES[e]}</span>
              ))}
            </p>
            <p className="s-micro s-mol-hint">Drag to rotate</p>
            <p className="s-about-refs">
              {panels.map((p) => (
                <a key={p.id} className="p-link text-xs" href={p.ref} target="_blank" rel="noopener noreferrer">
                  {blend ? `${p.label}: ` : ""}{refLink(p)}
                </a>
              ))}
            </p>
          </div>
          {blend ? <MoleculeGrid structures={panels} /> : panels[0] && <MoleculeViewer structure={panels[0]} />}
        </div>
      </section>

      <div className="p-container">
        <ResearchSummary productSlug={c.slug} name={c.name} />

        <section className="s-data">
          <div>
            <h2 className="s-h2">Compound <em>data</em></h2>
            <p>Identity and handling information for this material. The lot certificate is the authority for the vial you receive.</p>
            {c.identity.source && (
              <a className="p-link text-xs" href={c.identity.source} target="_blank" rel="noopener noreferrer">Identity source ↗</a>
            )}
          </div>
          <table className="s-panel">
            <tbody>
              {rows.filter(([, v]) => v).map(([k, v, mono]) => (
                <tr key={k}><td className="s-micro">{k}</td><td className={mono ? "s-mono" : undefined}>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="pt-18 pb-11">
          <h2 className="s-h2 mb-6">Researchers also <em>added</em></h2>
          <div className="s-grid">
            {relatedCompounds(c, 4, live.shown).map((r, i) => <CompoundCard key={r.slug} compound={r} index={i} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
