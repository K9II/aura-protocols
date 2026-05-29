import type { Metadata } from "next";
import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";
import { PLAYBOOK, EXTERNAL_REL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "The Peptide Protocol Playbook — Aura Protocols",
  description: `$${PLAYBOOK.priceUsd} digital guide: dosing, stacking, cycling, COA-reading. Written by the team behind Aura Protocols.`,
  alternates: { canonical: "/playbook" },
};

export default function PlaybookPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
        Digital guide — ${PLAYBOOK.priceUsd}
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold text-white md:text-5xl">
        The Peptide Protocol Playbook
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        Everything we wish someone had written when we started: dosing math for BPC-157, TB-500,
        CJC-1295/Ipamorelin and semaglutide; how to stack and cycle without burning receptors;
        and how to read a COA so you know what you&apos;re actually injecting.
      </p>
      <ul className="mt-6 space-y-2 text-slate-300">
        <li>• 40+ page PDF, plain-language, citation-backed.</li>
        <li>• Dosing calculators for the 6 most-used research peptides.</li>
        <li>• A 5-minute COA inspection checklist.</li>
        <li>• Lifetime updates as the regulatory landscape changes.</li>
      </ul>
      <Link
        href={PLAYBOOK.gumroadUrl}
        target="_blank"
        rel={EXTERNAL_REL}
        className="btn-primary mt-8 inline-flex"
      >
        Buy the Playbook — ${PLAYBOOK.priceUsd} →
      </Link>
      <p className="mt-4 text-xs text-slate-500">
        Educational content. Not medical advice. Aura Protocols is an affiliate publisher.
      </p>
      <div className="mt-12">
        <EmailCapture />
      </div>
    </main>
  );
}
