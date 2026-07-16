import BiosignatureSphere from "@/components/BiosignatureSphere";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">Free Peptide Protocol Engine</p>
      <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">
        Connect your wearable. Get a peptide protocol tuned to your data.
      </h1>
      <div className="mt-10 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-6 py-10 text-center">
        <BiosignatureSphere />
        <p className="mt-3 text-lg font-semibold text-white">Under Construction</p>
        <p className="mt-2 text-sm text-slate-300">The Engine is being rebuilt. Check back soon.</p>
      </div>
      <p className="mt-8 text-xs text-slate-500">
        Aura Protocols produces educational protocol suggestions, not medical advice. The Engine handles biometric fitness data — never PHI. For prescribed peptides, see Aura Clinical.
      </p>
    </main>
  );
}
