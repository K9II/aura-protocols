export const metadata = {
  title: "About — Aura Protocols",
  description: "Learn about Aura Protocols, our mission, vendor vetting methodology, and how we approach research peptide education.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">About Us</p>
      <h1 className="font-display text-4xl font-bold text-white mb-6">Built for serious researchers</h1>

      <div className="space-y-6 text-slate-400 leading-relaxed">
        <p>
          Aura Protocols is an independent research peptide resource founded in 2026. Our mission is simple: cut through
          the noise in the peptide vendor space and give researchers the information they need to source compounds they
          can actually trust.
        </p>
        <p>
          The peptide industry is crowded with inconsistent quality, misleading COA claims, and opaque sourcing. We
          built this platform to be different — fully transparent, affiliate-disclosed, and editorially independent.
          Every vendor recommendation is based on documented purity standards, not who pays us the most.
        </p>

        {/* Stats bar */}
        <div className="glass p-6 grid grid-cols-2 sm:grid-cols-4 gap-6 my-8">
          {[
            { stat: "25+", label: "Indexed pages" },
            { stat: "6", label: "Compounds reviewed" },
            { stat: "4", label: "Vetted vendors" },
            { stat: "100%", label: "FTC compliant" },
          ].map(({ stat, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-2xl font-bold text-cyan-400">{stat}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-white pt-2">Our vendor vetting process</h2>
        <p>
          Every vendor featured on Aura Protocols is evaluated against the same criteria before we link to a single
          product. We review documentation, check third-party testing records, and assess the checkout and customer
          service experience.
        </p>

        <div className="glass p-8 space-y-5">
          {[
            ["Third-Party COAs", "Every vendor must provide independent Certificates of Analysis for each batch. Generic or undated COAs do not pass."],
            ["HPLC Purity Testing", "We look for vendors who test to ≥98% purity via High-Performance Liquid Chromatography from accredited labs."],
            ["Transparent Sourcing", "No mystery suppliers. We favor vendors who disclose synthesis origin, QA processes, and storage standards."],
            ["Shipping & Fulfillment", "Domestic US shipping, discreet packaging, and reliable tracking are baseline requirements."],
            ["FTC Compliance", "Affiliate relationships are disclosed on every page, on every link. Always. No exceptions."],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-4">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
              <div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-white pt-2">What we cover</h2>
        <p>
          Our content spans the four primary research categories: recovery peptides (BPC-157, TB-500), weight management
          compounds (GLP-1 analogues), growth hormone secretagogues (CJC-1295/Ipamorelin, Sermorelin), and wellness
          peptides (PT-141). Each compound has a dedicated research guide, and vendors are compared head-to-head in our
          comparison series.
        </p>

        <h2 className="text-xl font-bold text-white pt-2">Affiliate transparency</h2>
        <p>
          Aura Protocols earns commissions when you purchase through our links — this is how the site is funded. It does
          not change our editorial standards. Vendors are evaluated independently of commission rates, and we decline to
          feature vendors who do not meet our purity and documentation benchmarks regardless of what they offer us.
        </p>
        <p>
          All affiliate links are labeled with <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">rel="sponsored"</code> per
          FTC and Google guidelines.
        </p>

        <p className="text-sm text-slate-500 border-t border-white/5 pt-6">
          All products referenced on this site are intended for research purposes only and are not intended to diagnose,
          treat, cure, or prevent any disease. Always consult a qualified healthcare professional before use.
        </p>
      </div>
    </div>
  );
}
