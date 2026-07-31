import type { Metadata } from "next";
import { AFFILIATE_REL } from "@/lib/constants";
import { products } from "@/data/products";
import { creativeFor, vendorCreative } from "@/data/vendorCreative";

export const metadata: Metadata = {
  title: "Vendor Collateral Example (Internal) — Aura Protocols",
  robots: { index: false, follow: false },
};

// Everything below is derived from the two real data sources — never a hardcoded
// path or URL — so this page also proves the registry is actually reusable.
function vendorUrl(productSlug: string, vendorName: string): string {
  const url = products.find((p) => p.slug === productSlug)?.vendors.find((v) => v.vendor === vendorName)?.url;
  if (!url) throw new Error(`No wired vendor URL for ${vendorName} on ${productSlug}`);
  return url;
}

const apolloLogo = vendorCreative.find((a) => a.vendorId === "apollo" && a.type === "logo")!;
const apolloRetatrutide = creativeFor("retatrutide").find((a) => a.vendorId === "apollo")!;
const apolloRetatrutideUrl = vendorUrl("retatrutide", "Apollo Peptide Sciences");
const mainNad = creativeFor("nad-plus").find((a) => a.vendorId === "main-peptides")!;
const mainNadUrl = vendorUrl("nad-plus", "Main Peptides");

const mitoProducts = [
  { slug: "slu-pp-332", name: "SLU-PP-332", blurb: "ERR pan-agonist research · exercise-mimetic pathway" },
  { slug: "ss-31", name: "SS-31", blurb: "Mitochondria-targeted · cardiolipin stabilization" },
  { slug: "mots-c", name: "MOTS-c", blurb: "Mitochondrial-derived peptide · metabolic regulation" },
].map((p) => ({
  ...p,
  asset: creativeFor(p.slug).find((a) => a.vendorId === "mile-high")!,
  url: vendorUrl(p.slug, "Mile High Compounds"),
}));

export default function VendorCollateralDemoPage() {
  return (
    <main className="pharmacopoeia">
      <div className="p-container py-16 max-w-[880px] mx-auto">
        <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">
          Internal demo — not linked, not indexed
        </p>
        <h1 className="p-serif text-3xl md:text-4xl mb-3 text-[color:var(--ink)]">
          Vendor Collateral in Practice
        </h1>
        <p className="text-[color:var(--ink-soft)] max-w-[62ch] leading-relaxed">
          Every image and link below is pulled from two real, reusable data sources —{" "}
          <code>src/data/vendorCreative.ts</code> (the asset registry: what file, which vendor, which product,
          what caveats) and the existing <code>products.ts</code> (the real wired affiliate URLs). Nothing here
          is a hardcoded path. As more vendors send real assets, they get one entry each in the registry and
          every page below updates automatically.
        </p>

        {/* ============================================================= */}
        {/* 1. BANNER CREATIVE — REAL ASSETS                               */}
        {/* ============================================================= */}
        <section className="mt-16 pb-16">
          <p className="p-cat-label mb-2">01 — Banner creative</p>
          <h2 className="p-serif text-2xl mb-4 text-[color:var(--ink)]">
            The real asset, built from Apollo&apos;s own files
          </h2>
          <p className="text-sm text-[color:var(--ink-soft)] mb-8 max-w-[62ch]">
            Their logo mark and Retatrutide product photography, composed into a unit — no invented copy, no
            placeholder graphics.
          </p>

          <div className="flex flex-wrap gap-10 items-start">
            {/* the banner unit */}
            <div className="relative w-[336px] shrink-0">
              <span className="absolute -top-3 -right-3 z-10 bg-[color:var(--specimen)] text-[color:var(--paper)] text-[9px] uppercase tracking-widest font-bold px-2 py-1">
                Real asset
              </span>
              <a
                href={apolloRetatrutideUrl}
                target="_blank"
                rel={AFFILIATE_REL}
                className="block border no-underline"
                style={{
                  borderColor: "var(--ink)",
                  background: "var(--paper-deep)",
                  padding: "20px",
                }}
              >
                <img
                  src={apolloLogo.path}
                  alt="Apollo Peptide Sciences"
                  width={apolloLogo.width}
                  height={apolloLogo.height}
                  className="w-[110px] h-auto mx-auto mb-3"
                />
                <img
                  src={apolloRetatrutide.path}
                  alt="Apollo Peptide Sciences Retatrutide 15mg, three vials"
                  width={apolloRetatrutide.width}
                  height={apolloRetatrutide.height}
                  className="w-full h-auto mb-3"
                />
                <p className="p-serif text-xl leading-tight text-[color:var(--ink)] mb-1 text-center">
                  Retatrutide
                </p>
                <p className="text-xs text-[color:var(--ink-soft)] mb-4 text-center">
                  Lyophilized powder &middot; Purity &gt;99% &middot; For research use only
                </p>
                <span className="p-btn-primary block text-center text-sm py-2">
                  Shop Retatrutide at Apollo →
                </span>
              </a>
              <p className="text-[11px] text-[color:var(--ink-soft)] mt-2 text-center">
                Real logo + real product photography, from Apollo&apos;s affiliate portal
              </p>
            </div>

            {/* what changed vs. the mockup */}
            <div className="flex-1 min-w-[240px] text-sm text-[color:var(--ink-soft)] space-y-3 pt-2">
              <p><strong className="text-[color:var(--ink)]">No invented code</strong> — {apolloRetatrutide.caveat}</p>
              <p><strong className="text-[color:var(--ink)]">Real product photography</strong> — actual vial art beats any icon or placeholder for trust signal.</p>
              <p><strong className="text-[color:var(--ink)]">Live affiliate link</strong> — pulled straight from <code>products.ts</code>, so it&apos;s always the current tracked URL.</p>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 2. THE ACTUAL PRODUCT PAGE — BEFORE / AFTER                    */}
        {/* ============================================================= */}
        <section className="pb-16" style={{ borderTop: "1px solid var(--line)", paddingTop: "56px" }}>
          <p className="p-cat-label mb-2">02 — On the actual product page</p>
          <h2 className="p-serif text-2xl mb-4 text-[color:var(--ink)]">
            /products/retatrutide — before &amp; after
          </h2>
          <p className="text-sm text-[color:var(--ink-soft)] mb-8 max-w-[62ch]">
            This replicates the real &ldquo;Where to Buy&rdquo; sidebar from <code>VendorCompareList.tsx</code>,
            same vendor order (sorted by commission), same copy — nothing invented. One{" "}
            <strong className="text-[color:var(--ink)]">featured</strong> banner sits above the comparison list —
            the full list underneath stays exactly as it renders today, unchanged, Apollo included, so people can
            still compare all seven.
          </p>

          <div className="grid sm:grid-cols-2 gap-8">
            {/* BEFORE */}
            <div>
              <p className="text-xs uppercase tracking-widest text-[color:var(--ink-soft)] font-semibold mb-3">Before — today</p>
              <div className="p-6" style={{ background: "var(--paper-deep)" }}>
                {[
                  { vendor: "GLP-1 Research Lab", fact: "Broad catalog spanning GLP-1s, wellness peptides, and recovery compounds", note: undefined },
                  { vendor: "Apollo Peptide Sciences", fact: "Carries tirzepatide and retatrutide variants alongside semaglutide", note: undefined },
                  { vendor: "PSPeptides", fact: "Third confirmed source for the Wolverine, GLOW, and KLOW stacks", note: "Use code AURAPRO10 for 10% off" },
                  { vendor: "Ignite Peptides", fact: "Broadest confirmed catalog among approved vendors — 30+ compounds", note: undefined },
                  { vendor: "Peak Lab Peptides", fact: "Sole confirmed vendor for SLU-PP-332 on this site", note: undefined },
                  { vendor: "Mile High Compounds", fact: "Second confirmed source for SLU-PP-332, broad catalog overlap", note: "Use code auraproto for 10% off" },
                  { vendor: "Main Peptides", fact: "Carries SS-31 with third-party purity testing documented", note: undefined },
                ].map((v, i) => (
                  <div key={v.vendor} className={`text-center ${i > 0 ? "pt-3 mt-3 border-t border-[color:var(--line)]" : ""}`}>
                    <p className="text-sm font-semibold text-[color:var(--ink)] mb-1">{v.vendor}</p>
                    <p className="text-xs text-[color:var(--ink-soft)] mb-2">{v.fact}</p>
                    {v.note && <p className="text-xs text-[color:var(--ink-soft)] mb-2">{v.note}</p>}
                    <span className={`w-full text-center text-xs py-2 block cursor-default ${i === 0 ? "p-btn-primary" : "p-btn-outline"}`} aria-disabled="true">
                      Buy Direct from {v.vendor} →
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AFTER */}
            <div>
              <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-3">After — one featured banner, list unchanged</p>

              {/* Featured banner — sits above the list, not inside it */}
              <a
                href={apolloRetatrutideUrl}
                target="_blank"
                rel={AFFILIATE_REL}
                className="relative block border no-underline mb-4"
                style={{ borderColor: "var(--ink)", background: "var(--paper)", padding: "12px" }}
              >
                <span className="absolute top-2 right-2 text-[8px] uppercase tracking-widest font-bold text-[color:var(--paper)] bg-[color:var(--specimen)] px-1.5 py-0.5">
                  Featured
                </span>
                <img
                  src={apolloRetatrutide.path}
                  alt="Apollo Peptide Sciences Retatrutide"
                  width={apolloRetatrutide.width}
                  height={apolloRetatrutide.height}
                  className="w-full h-auto mb-2"
                />
                <p className="text-sm font-semibold text-[color:var(--ink)] text-center mb-2">Apollo Peptide Sciences</p>
                <span className="w-full text-center text-xs py-2 block p-btn-primary">
                  Shop Retatrutide at Apollo →
                </span>
              </a>

              {/* Full comparison list — identical to Before, Apollo included, nothing removed */}
              <div className="p-6" style={{ background: "var(--paper-deep)" }}>
                {[
                  { vendor: "GLP-1 Research Lab", fact: "Broad catalog spanning GLP-1s, wellness peptides, and recovery compounds", note: undefined },
                  { vendor: "Apollo Peptide Sciences", fact: "Carries tirzepatide and retatrutide variants alongside semaglutide", note: undefined },
                  { vendor: "PSPeptides", fact: "Third confirmed source for the Wolverine, GLOW, and KLOW stacks", note: "Use code AURAPRO10 for 10% off" },
                  { vendor: "Ignite Peptides", fact: "Broadest confirmed catalog among approved vendors — 30+ compounds", note: undefined },
                  { vendor: "Peak Lab Peptides", fact: "Sole confirmed vendor for SLU-PP-332 on this site", note: undefined },
                  { vendor: "Mile High Compounds", fact: "Second confirmed source for SLU-PP-332, broad catalog overlap", note: "Use code auraproto for 10% off" },
                  { vendor: "Main Peptides", fact: "Carries SS-31 with third-party purity testing documented", note: undefined },
                ].map((v, i) => (
                  <div key={v.vendor} className={`text-center ${i > 0 ? "pt-3 mt-3 border-t border-[color:var(--line)]" : ""}`}>
                    <p className="text-sm font-semibold text-[color:var(--ink)] mb-1">{v.vendor}</p>
                    <p className="text-xs text-[color:var(--ink-soft)] mb-2">{v.fact}</p>
                    {v.note && <p className="text-xs text-[color:var(--ink-soft)] mb-2">{v.note}</p>}
                    <span className={`w-full text-center text-xs py-2 block cursor-default ${i === 0 ? "p-btn-primary" : "p-btn-outline"}`} aria-disabled="true">
                      Buy Direct from {v.vendor} →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[color:var(--ink-soft)] mt-4 max-w-[62ch]">
            This scales the way the busy-page concern requires: no matter how many vendors eventually send real
            creative, there&apos;s still exactly one banner slot per product — picked as the best combination of
            real asset + commission, not stacked. Everything else on the page — header, benefits, disclaimer,
            related products, and the full comparison list itself — is unchanged.
          </p>
        </section>

        {/* ============================================================= */}
        {/* 3. PLACED IN CONTEXT — BLOG                                    */}
        {/* ============================================================= */}
        <section className="pb-16" style={{ borderTop: "1px solid var(--line)", paddingTop: "56px" }}>
          <p className="p-cat-label mb-2">03 — Same banner, on a blog post too</p>
          <h2 className="p-serif text-2xl mb-4 text-[color:var(--ink)]">
            Sidebar placement on the Retatrutide research guide
          </h2>
          <p className="text-sm text-[color:var(--ink-soft)] mb-8 max-w-[62ch]">
            A simplified version of <code>/blog/retatrutide-research-guide</code> with the real banner sitting in
            the rail beside the article.
          </p>

          <div className="grid md:grid-cols-[1fr_240px] gap-10 border p-8" style={{ borderColor: "var(--line)" }}>
            <div>
              <p className="p-serif text-xl mb-3 text-[color:var(--ink)]">
                Retatrutide: The Complete Research Guide
              </p>
              <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed mb-3">
                Retatrutide is a single molecule that activates three separate metabolic receptors at once. Its
                Phase 3 data is the strongest of anything in this category&hellip;
              </p>
              <p className="text-xs text-[color:var(--ink-soft)] italic">
                (article continues &mdash; excerpt only, for layout purposes)
              </p>
            </div>

            <div className="w-full max-w-[240px]">
              <a
                href={apolloRetatrutideUrl}
                target="_blank"
                rel={AFFILIATE_REL}
                className="block border text-[13px] no-underline"
                style={{ borderColor: "var(--ink)", background: "var(--paper-deep)", padding: "14px" }}
              >
                <img
                  src={apolloRetatrutide.path}
                  alt="Apollo Peptide Sciences Retatrutide 15mg"
                  width={apolloRetatrutide.width}
                  height={apolloRetatrutide.height}
                  className="w-full h-auto mb-2"
                />
                <div className="flex items-center justify-between mb-2">
                  <span className="p-serif text-sm text-[color:var(--ink)]">Apollo</span>
                  <span className="text-[8px] uppercase tracking-widest text-[color:var(--ink-soft)]">Ad</span>
                </div>
                <p className="text-[11px] text-[color:var(--ink-soft)] mb-2">Retatrutide &middot; Purity &gt;99%</p>
                <span className="p-btn-outline block text-center text-xs py-1.5">
                  Shop →
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 4. SWIPE COPY — still no real vendor text confirmed anywhere   */}
        {/* ============================================================= */}
        <section className="pb-16" style={{ borderTop: "1px solid var(--line)", paddingTop: "56px" }}>
          <p className="p-cat-label mb-2">04 — Swipe copy</p>
          <h2 className="p-serif text-2xl mb-4 text-[color:var(--ink)]">Still illustrative — no vendor has sent real copy yet</h2>
          <p className="text-sm text-[color:var(--ink-soft)] mb-6 max-w-[62ch]">
            Unlike the banners above, no vendor has provided actual pre-approved marketing copy anywhere in this
            check. The two blocks below remain placeholder wording, kept only to show the two formats it would
            take once real copy exists.
          </p>

          <h3 className="text-sm font-semibold text-[color:var(--ink)] mt-8 mb-2">
            (a) As an in-article CTA block — matches the existing <code>type: &quot;cta&quot;</code> pattern in <code>posts.ts</code>
          </h3>
          <div className="p-callout p-6 max-w-[520px]" style={{ border: "1px solid var(--line)" }}>
            <p className="p-serif text-lg mb-2 text-[color:var(--ink)]">
              Apollo&apos;s Retatrutide ships at &gt;99% purity, lyophilized for stability, for research use only.
            </p>
            <p className="text-sm text-[color:var(--ink-soft)] mb-4">
              [Placeholder — replace with Apollo&apos;s own pre-approved copy once their affiliate contact sends it.]
            </p>
            <span className="p-btn-primary inline-block text-sm py-2 px-5 cursor-default" aria-disabled="true">
              View Retatrutide at Apollo →
            </span>
          </div>

          <h3 className="text-sm font-semibold text-[color:var(--ink)] mt-10 mb-2">
            (b) As raw text — reused verbatim in an email send or social caption
          </h3>
          <div
            className="max-w-[560px] font-mono text-[13px] leading-relaxed p-5"
            style={{ background: "var(--ink)", color: "var(--paper)" }}
          >
            &ldquo;[Placeholder] Apollo Peptide Sciences&apos; Retatrutide is lyophilized, &gt;99% pure, and shipped
            for research use only.&rdquo;
          </div>
          <p className="text-[11px] text-[color:var(--ink-soft)] mt-2">
            Still a placeholder — no vendor in this check had real swipe copy on file. Ask each affiliate contact directly.
          </p>
        </section>

        {/* ============================================================= */}
        {/* 5. VENDOR-DESIGNED, READY-TO-USE BANNER — MAIN PEPTIDES        */}
        {/* ============================================================= */}
        <section className="pb-16" style={{ borderTop: "1px solid var(--line)", paddingTop: "56px" }}>
          <p className="p-cat-label mb-2">05 — A banner that needs no composing</p>
          <h2 className="p-serif text-2xl mb-4 text-[color:var(--ink)]">
            /products/nad-plus — a fully vendor-designed asset
          </h2>
          <p className="text-sm text-[color:var(--ink-soft)] mb-6 max-w-[62ch]">
            Different from Apollo and Mile High above — those were raw product photography that I built a
            template around. This one is a finished, ready-to-drop-in ad straight from Main Peptides&apos;
            Creatives library: their own headline, logo, offer, and CTA already composed. No wrapper needed.
          </p>

          <div className="max-w-[380px]">
            <a href={mainNadUrl} target="_blank" rel={AFFILIATE_REL} className="relative block no-underline">
              <span className="absolute top-2 right-2 z-10 text-[8px] uppercase tracking-widest font-bold text-[color:var(--paper)] bg-[color:var(--specimen)] px-1.5 py-0.5">
                Featured
              </span>
              <img
                src={mainNad.path}
                alt="Main Peptides — Peptides You Can Trust, NAD+ 500mg, 15% off"
                width={mainNad.width}
                height={mainNad.height}
                className="w-full h-auto border"
                style={{ borderColor: "var(--ink)" }}
              />
            </a>
          </div>

          <p className="text-[11px] text-[color:var(--ink-soft)] mt-3 max-w-[62ch]">
            {mainNad.caveat} Also, Main Peptides is the <em>lowest</em>-commission vendor on the NAD+ page (10%,
            versus 30% for GLP-1 Research Lab) — it&apos;s the featured slot here only because it&apos;s the one
            vendor with a real, finished asset, which is a real trade-off worth being deliberate about, not an
            accident.
          </p>
        </section>

        {/* ============================================================= */}
        {/* 6. THEMED MULTI-PRODUCT BANNER — REAL MILE HIGH ASSETS         */}
        {/* ============================================================= */}
        <section className="pb-16" style={{ borderTop: "1px solid var(--line)", paddingTop: "56px" }}>
          <p className="p-cat-label mb-2">06 — A themed grouping, not just one product</p>
          <h2 className="p-serif text-2xl mb-4 text-[color:var(--ink)]">
            Mitochondrial Repair &amp; ATP Production — Mile High Compounds
          </h2>
          <p className="text-sm text-[color:var(--ink-soft)] mb-8 max-w-[62ch]">
            SLU-PP-332, SS-31, and MOTS-c all sit under the same mechanism story — mitochondrial biogenesis,
            membrane stabilization, and cellular energy output — so they read naturally as one grouped unit
            rather than three separate banners. Real product photography, real logo, and Mile High already
            has a working discount code on file for all three.
          </p>

          <div className="grid sm:grid-cols-3 gap-5">
            {mitoProducts.map((p) => (
              <a
                key={p.slug}
                href={p.url}
                target="_blank"
                rel={AFFILIATE_REL}
                className="block border no-underline"
                style={{ borderColor: "var(--ink)", background: "var(--paper-deep)", padding: "16px" }}
              >
                <img
                  src={p.asset.path}
                  alt={`Mile High Compounds ${p.name}`}
                  width={p.asset.width}
                  height={p.asset.height}
                  className="w-full h-auto mb-3"
                />
                <p className="p-serif text-lg text-[color:var(--ink)] mb-1 text-center">{p.name}</p>
                <p className="text-[11px] text-[color:var(--ink-soft)] mb-3 text-center leading-snug">{p.blurb}</p>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-mono text-xs text-[color:var(--specimen)]">{p.asset.code}</span>
                  <span className="text-[9px] uppercase tracking-wider text-[color:var(--ink-soft)]">10% off</span>
                </div>
                <span className="p-btn-primary block text-center text-sm py-2">Shop {p.name} →</span>
              </a>
            ))}
          </div>
          <p className="text-[11px] text-[color:var(--ink-soft)] mt-4">
            {mitoProducts[0].asset.caveat}
          </p>
        </section>

        {/* ============================================================= */}
        {/* 7. STATUS ACROSS ALL 8 VENDORS                                 */}
        {/* ============================================================= */}
        <section className="pb-4" style={{ borderTop: "1px solid var(--line)", paddingTop: "56px" }}>
          <p className="p-cat-label mb-2">07 — What was actually checked</p>
          <h2 className="p-serif text-2xl mb-4 text-[color:var(--ink)]">Collateral status, all 8 vendors</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ink)" }}>
                  <th className="text-left py-2 pr-4 text-[color:var(--ink)]">Vendor</th>
                  <th className="text-left py-2 text-[color:var(--ink)]">Status</th>
                </tr>
              </thead>
              <tbody className="text-[color:var(--ink-soft)]">
                {[
                  ["Apollo Peptide Sciences", "Real banner + logo confirmed — used above"],
                  ["Ignite Peptides", "Creatives tab exists, empty — ask them to populate it"],
                  ["Limitless Life Nootropics", "Creatives tab exists, only a generic platform doc — ask for real assets"],
                  ["PSPeptides", "No creative tab exists in their system"],
                  ["Peak Lab Peptides", "No creative/marketing feature exists in their affiliate plugin"],
                  ["Main Peptides", "Real ready-made banner confirmed (NAD+) — used above; verify the \"15% off\" claim against the still-pending discount code"],
                  ["Mile High Compounds", "Real photography confirmed for 3 products (manual login past the CAPTCHA) — used above, plus a working auraproto code"],
                  ["GLP-1 Research Lab", "Not checked — tracking broken, relationship on hold"],
                ].map(([vendor, status]) => (
                  <tr key={vendor} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="py-2 pr-4 text-[color:var(--ink)]">{vendor}</td>
                    <td className="py-2">{status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[color:var(--ink-soft)] mt-4 max-w-[62ch]">
            Real assets on file today live in <code>src/data/vendorCreative.ts</code> (
            {vendorCreative.length} entries across {new Set(vendorCreative.map((a) => a.vendorId)).size} vendors) —
            add one entry per new file as vendors send more, no page code changes required.
          </p>
        </section>
      </div>
    </main>
  );
}
