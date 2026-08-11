import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Telehealth Disclosures — Modality",
  alternates: { canonical: "/disclosures" },
};

export default function DisclosuresPage() {
  return (
    <div className="page">
      <div className="legal">
        <p className="eyebrow">Legal</p>
        <h1>Telehealth Disclosures</h1>
        <p className="updated">Last updated: August 10, 2026</p>

        <section>
          <h2>Modality&rsquo;s Role</h2>
          <p>
            Modality operates this website and refers interested visitors to telehealth services provided by
            our partner, Leg Up Recovery, and its affiliated licensed medical group.{" "}
            <strong>Modality is not a medical provider, pharmacy, or telehealth platform.</strong> We do not
            practice medicine, provide medical advice, prescribe, or dispense any medication.
          </p>
        </section>

        <section>
          <h2>Who Provides Care</h2>
          <p>
            All clinical evaluation, prescribing, and treatment decisions are made by{" "}
            <strong>independent, state-licensed clinicians</strong> through the partner&rsquo;s platform. A
            prescription is issued only if a clinician determines it is appropriate for you. Fulfillment, where
            applicable, is handled by licensed pharmacies.
          </p>
        </section>

        <section>
          <h2>No Doctor&ndash;Patient Relationship with Modality</h2>
          <p>
            Using this site does not create a doctor&ndash;patient relationship with Modality. That
            relationship, if any, is formed with the clinicians on the partner&rsquo;s platform.
          </p>
        </section>

        <section>
          <h2>Not Medical Advice &amp; Emergencies</h2>
          <p>
            Information on this site is general and educational, not medical advice, and not a substitute for
            care from your own physician. <strong>If you have a medical emergency, call 911.</strong>
          </p>
        </section>

        <section>
          <h2>Eligibility, Pricing &amp; Availability</h2>
          <p>
            Programs, prices, and product availability are set by the partner and can change at any time.
            Availability and eligibility vary by state, and not all products are available everywhere. Products
            are for eligible patients only.
          </p>
        </section>

        <section>
          <h2>Your Information</h2>
          <p>
            Any health information you enter on the partner&rsquo;s intake is collected and governed by the
            partner and its medical group under their privacy practices (including HIPAA where applicable) &mdash;{" "}
            <strong>not by Modality</strong>. Any email address you provide to Modality on this site is used to
            send protocol updates you can unsubscribe from at any time. Modality does not receive or store your
            medical information.
          </p>
        </section>

        <section>
          <h2>Financial Relationship</h2>
          <p>
            Modality has a financial relationship with the telehealth partner and may be compensated when you
            begin a program through our links. This does not change the price you pay or influence any clinical
            decision.
          </p>
        </section>

        <section>
          <h2>Changes to These Disclosures</h2>
          <p>
            We may update these disclosures as programs and partners change. The &ldquo;Last updated&rdquo; date
            above reflects the most recent revision.
          </p>
        </section>

        <a className="back" href="/">&larr; Back to Modality</a>
      </div>
    </div>
  );
}
