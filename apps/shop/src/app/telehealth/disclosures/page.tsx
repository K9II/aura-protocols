import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Telehealth Disclosures",
  alternates: { canonical: "/telehealth/disclosures" },
};

export default function TelehealthDisclosuresPage() {
  return (
    <main className="pharmacopoeia">
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">Legal</p>
      <h1 className="p-serif text-4xl mb-3 text-[color:var(--ink)]">Telehealth Disclosures</h1>
      <p className="text-sm text-[color:var(--ink-soft)] mb-10">Last Updated: August 9, 2026</p>

      <div className="space-y-8 text-[color:var(--ink-soft)] leading-relaxed">

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Aura&rsquo;s Role</h2>
          <p>
            Aura Protocols operates this website and refers interested visitors to telehealth services provided by our partner, Leg Up Recovery, and its affiliated licensed medical group. <strong className="text-[color:var(--ink)]">Aura Protocols is not a medical provider, pharmacy, or telehealth platform.</strong> We do not practice medicine, provide medical advice, prescribe, or dispense any medication.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Who Provides Care</h2>
          <p>
            All clinical evaluation, prescribing, and treatment decisions are made by <span className="text-[color:var(--ink)]">independent, state-licensed clinicians</span> through the partner&rsquo;s platform. A prescription is issued only if a clinician determines it is appropriate for you. Fulfillment, where applicable, is handled by licensed pharmacies.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">No Doctor&ndash;Patient Relationship with Aura</h2>
          <p>
            Using this site does not create a doctor&ndash;patient relationship with Aura Protocols. That relationship, if any, is formed with the clinicians on the partner&rsquo;s platform.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Not Medical Advice &amp; Emergencies</h2>
          <p>
            Information on this site is general and educational, not medical advice, and not a substitute for care from your own physician. <strong className="text-[color:var(--ink)]">If you have a medical emergency, call 911.</strong>
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Eligibility, Pricing &amp; Availability</h2>
          <p>
            Programs, prices, and product availability are set by the partner and can change at any time. Availability and eligibility vary by state, and not all products are available everywhere. Products are for eligible patients only.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Your Information</h2>
          <p>
            Any health information you enter on the partner&rsquo;s intake is collected and governed by the partner and its medical group under their privacy practices (including HIPAA where applicable) &mdash; <span className="text-[color:var(--ink)]">not by Aura</span>. Any email address you provide to Aura on this site is governed by Aura&rsquo;s{" "}
            <a href="/privacy" className="p-link">Privacy Policy</a>. Aura does not receive or store your medical information.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Financial Relationship</h2>
          <p>
            Aura Protocols has a financial relationship with the telehealth partner and may be compensated when you begin a program through our links. This does not change the price you pay or influence any clinical decision.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Research Compounds Are Separate</h2>
          <p>
            Research peptides and related products featured elsewhere on this site are sold by third-party vendors, are <strong className="text-[color:var(--ink)]">for research use only, not for human consumption</strong>, and are entirely separate from the clinician-prescribed telehealth programs described here.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Changes to These Disclosures</h2>
          <p>
            We may update these disclosures as programs and partners change. The &ldquo;Last Updated&rdquo; date above reflects the most recent revision.
          </p>
        </section>

      </div>
    </div>
    </main>
  );
}
