import type { Metadata } from "next";
import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "Peptides for Women & Perimenopause",
  description:
    "The peptide research relevant to perimenopause — what's being studied for body-composition, sleep, joint, and libido changes. Educational and research-only.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/women" },
};

export default function WomenPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-rose-300 mb-4">
        Perimenopause · 40–55
      </p>
      <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
        Peptides for perimenopause — finally taken seriously.
      </h1>
      <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed space-y-4 mb-10">
        <p>
          HRT is half the conversation. The peptide research relevant to perimenopause is rarely discussed alongside it —
          the compounds being studied for the body-composition shift, sleep disruption, joint changes, and libido shifts
          of this phase, and what the literature actually shows.
        </p>
        <p>
          Our launch series covers the research behind each: BPC-157 and connective-tissue studies, growth-hormone
          peptides and body-composition research, sermorelin and sleep architecture, PT-141&apos;s melanocortin pathway,
          and what&apos;s known about the maintenance window after GLP-1. Educational and research-focused — not medical advice.
        </p>
        <p>
          Want the launch posts as soon as they ship? Drop your email below.
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
