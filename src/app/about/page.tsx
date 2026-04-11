export const metadata = {
  title: "About — Aura Protocols",
  description: "Learn about Aura Protocols, our mission, and how we vet the vendors we recommend.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">Our Story</p>
      <h1 className="text-4xl font-extrabold text-white mb-6">About Aura Protocols</h1>

      <div className="space-y-6 text-slate-400 leading-relaxed">
        <p>
          Aura Protocols was founded with a simple mission: cut through the noise in the research peptide space and connect serious buyers with suppliers they can actually trust.
        </p>
        <p>
          The peptide industry is filled with inconsistent quality, misleading labels, and opaque sourcing. We built this platform to be different — fully transparent, affiliate-disclosed, and editorially independent.
        </p>
        <p>
          Every vendor featured on Aura Protocols has been manually reviewed for third-party purity testing, Certificate of Analysis availability, and customer service track record. We only feature suppliers we would personally use.
        </p>

        <div className="glass p-8 mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white">Our Standards</h2>
          {[
            ["Third-Party COAs", "Every vendor must provide independent Certificates of Analysis for each batch."],
            ["HPLC Purity Testing", "We look for vendors who test to ≥98% purity via High-Performance Liquid Chromatography."],
            ["Transparent Sourcing", "No mystery suppliers. We favor vendors who disclose their synthesis and QA processes."],
            ["FTC Compliance", "Affiliate relationships are disclosed on every page. Always."],
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

        <p className="text-sm text-slate-500">
          All products referenced on this site are intended for research purposes only and are not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified healthcare professional before use.
        </p>
      </div>
    </div>
  );
}
