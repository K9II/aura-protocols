import type { Metadata } from "next";
import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "Peptides for Masters Athletes",
  description:
    "The recovery-peptide research relevant to 40+ athletes — tendon, GI, and sleep-adaptation studies. Research-only; not for tested-sport competition.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/masters" },
};

export default function MastersPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300 mb-4">
        Masters Athletes · 40+
      </p>
      <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
        Recovery peptide research for masters athletes — and the WADA reality.
      </h1>
      <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed space-y-4 mb-10">
        <p>
          BPC-157 and TB-500 sit on the WADA banned list. If you compete in a tested sport, that matters and this page
          isn&apos;t for you. For everyone else — masters meets, weekend warriors, longevity-first programming — these are
          the peptides studied for tendon repair, gut recovery, and sleep-driven adaptation. Here&apos;s what the research
          shows, and where it stops.
        </p>
        <p>
          Launch posts in queue cover the research behind each: BPC-157 and tendon studies, TB-500 and overuse-injury
          models, CJC-1295/Ipamorelin and recovery-phase GH research, sermorelin and sleep architecture, and how
          researchers approach recovery at 40+. Educational and research-only — not medical advice.
        </p>
        <p>
          Want them as they ship? Drop your email below.
        </p>
      </div>
      <EmailCapture />
      <p className="mt-10 text-sm text-slate-500">
        Browsing now?{" "}
        <Link href="/#protocols" className="text-cyan-300 hover:text-cyan-200 underline">
          See the full protocol library →
        </Link>
      </p>
    </div>
  );
}
