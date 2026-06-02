import type { Metadata } from "next";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "The Peptide Protocol Playbook — Aura Protocols",
  description:
    "The Peptide Protocol Playbook is being revised. Join the list to hear when the updated edition is available.",
  alternates: { canonical: "/playbook" },
};

export default function PlaybookPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
        Coming back soon
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold text-white md:text-5xl">
        The Peptide Protocol Playbook
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        We&apos;re revising the Playbook. Drop your email and you&apos;ll be the first to know when
        the updated edition is available.
      </p>
      <p className="mt-4 text-xs text-slate-500">
        Educational content. Not medical advice. Aura Protocols is an affiliate publisher.
      </p>
      <div className="mt-10">
        <EmailCapture />
      </div>
    </main>
  );
}
