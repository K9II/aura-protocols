import type { Metadata } from "next";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "Your Peptide Starting Protocol | Aura Protocols",
  description:
    "Pick your #1 goal and get a research-backed peptide starting protocol — doses, timing, and COA-verified sources — sent to your inbox.",
  robots: { index: false, follow: false },
};

export default function CheatSheetPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
        Free starting protocol
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold text-white md:text-5xl">
        Get your peptide starting protocol
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        Tell us your #1 goal and we&apos;ll send a research-backed starting point — doses, timing,
        and COA-verified sources — straight to your inbox.
      </p>
      <p className="mt-4 text-xs text-slate-500">
        Research reference only. Not medical advice.
      </p>
      <div className="mt-10">
        <EmailCapture />
      </div>
    </main>
  );
}
