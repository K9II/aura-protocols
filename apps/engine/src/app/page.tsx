import BiosignatureSphere from "@/components/BiosignatureSphere";

export default function HomePage() {
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16 md:py-24 max-w-3xl">
        <p className="p-cat-label mb-3">Free Peptide Protocol Engine</p>
        <h1 className="p-serif text-4xl md:text-5xl leading-[1.1] mb-6">
          Connect your wearable. Get a peptide protocol tuned to <em className="p-serif-italic text-[color:var(--specimen)]">your data.</em>
        </h1>
        <div className="p-callout border border-[color:var(--line)] px-6 py-10 text-center">
          <BiosignatureSphere />
          <p className="text-sm text-[color:var(--ink-soft)] mt-4">The Engine is being rebuilt. Check back soon.</p>
        </div>
        <p className="mt-8 text-xs text-[color:var(--ink-faint)] leading-relaxed">
          Aura Protocols produces educational protocol suggestions, not medical advice. The Engine handles biometric fitness data — never PHI. For prescribed peptides, see Modality.
        </p>
      </div>
    </div>
  );
}
