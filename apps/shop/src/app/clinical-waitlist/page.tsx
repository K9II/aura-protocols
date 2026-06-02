import type { Metadata } from "next";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "Aura Clinical — Waitlist",
  description:
    "Compounded peptides via a US-licensed MD. Cash-pay, $249–$499/mo. Join the waitlist for early access.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/clinical-waitlist" },
};

export default function ClinicalWaitlistPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-300 mb-4">
        Aura Clinical · Coming soon
      </p>
      <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
        Compounded peptides, prescribed by a US-licensed MD.
      </h1>
      <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed space-y-4 mb-10">
        <p>
          Aura Clinical will be the prescription layer of the Aura stack: a planned cash-pay subscription (target
          $249–$499/mo), compounded by a 503A pharmacy under a US-licensed MD&apos;s order. No insurance hassle. No grey-market sourcing.
        </p>
        <p>
          We&apos;re onboarding our medical director and pharmacy partner now. Join the waitlist and you&apos;ll be first
          in line when we open enrollment — including a founder window with locked-in pricing.
        </p>
        <p className="text-sm text-slate-500">
          Aura Clinical is operated by a separate, regulated entity from this editorial site. Information here is not medical advice.
        </p>
      </div>
      <EmailCapture />
    </div>
  );
}
