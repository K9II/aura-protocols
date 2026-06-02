import Link from "next/link";

export default function WomensBand() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div
        className="rounded-2xl border border-rose-400/20 p-8 md:p-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(13, 17, 23, 0.6) 60%)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-300 mb-3">
          Perimenopause · 40–55
        </p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4 max-w-2xl">
          Peptides for perimenopause — finally taken seriously.
        </h2>
        <p className="text-slate-300 leading-relaxed mb-7 max-w-2xl">
          Midi and Alloy handle HRT — not peptides. We cover the peptide research relevant to perimenopause: the compounds being studied for body-composition, sleep, joint, and libido changes in the 40–55 phase. Educational and research-focused.
        </p>
        <Link href="/women" className="btn-outline">
          Explore peptides for women →
        </Link>
      </div>
    </section>
  );
}
