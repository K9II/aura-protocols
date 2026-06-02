import type { Metadata } from "next";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "Peptide Protocol Cheat Sheet | Aura Protocols",
  description:
    "This research reference is being updated. Join the list to get it when the new edition is ready.",
  robots: { index: false, follow: false },
};

export default function CheatSheetPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
        Being updated
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold text-white md:text-5xl">
        Peptide Protocol Cheat Sheet
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        We&apos;re revising this reference. Drop your email and we&apos;ll send it as soon as the
        updated edition is ready.
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
