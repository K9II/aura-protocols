import Link from "next/link";

export default function MastersAthletesBand() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div
        className="rounded-2xl border border-emerald-400/20 p-8 md:p-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 17, 23, 0.6) 60%)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300 mb-3">
          Masters Athletes · 40+
        </p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4 max-w-2xl">
          Recovery peptide research for masters athletes — and the WADA reality.
        </h2>
        <p className="text-slate-300 leading-relaxed mb-7 max-w-2xl">
          BPC-157 and TB-500 sit on the WADA banned list — so we don&apos;t market them to competing athletes. For masters meets, weekend warriors, and longevity-first training, these are the peptides studied for tendon repair, gut recovery, and sleep-driven adaptation. We cover what the research shows at 40+ — educational and research-only.
        </p>
        <Link href="/masters" className="btn-outline">
          Explore peptides for masters athletes →
        </Link>
      </div>
    </section>
  );
}
