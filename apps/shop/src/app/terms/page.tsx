import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="pharmacopoeia max-w-3xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">Legal</p>
      <h1 className="p-serif text-4xl mb-3 text-[color:var(--ink)]">Terms of Service</h1>
      <p className="text-sm text-[color:var(--ink-soft)] mb-10">Last Updated: April 12, 2026</p>

      <div className="space-y-8 text-[color:var(--ink-soft)] leading-relaxed">

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Introduction</h2>
          <p>
            By accessing or using <span className="text-[color:var(--ink)]">shop.auraprotocols.com</span> (the &ldquo;Site&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Site. These terms apply to all visitors and users of the Site.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Research Purposes Only</h2>
          <p>
            All content published on this Site — including product descriptions, guides, comparisons, and blog articles — is provided for <strong className="text-[color:var(--ink)]">informational and research purposes only</strong>. Nothing on this Site constitutes medical advice, a medical diagnosis, or a recommendation for any specific treatment or course of action.
          </p>
          <p className="mt-4">
            The compounds discussed on this Site are research chemicals. They are not approved by the FDA for human consumption. Always consult a licensed healthcare professional before using any compound, supplement, or substance discussed here. Use is entirely at your own risk.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Affiliate Relationships</h2>
          <p>
            Aura Protocols participates in affiliate marketing programs. This means we may earn a commission when you make a purchase through links on this Site, at no additional cost to you. Affiliate relationships are disclosed on every page via the banner at the top of the Site and on individual product and comparison pages.
          </p>
          <p className="mt-4">
            Our editorial content — including vendor ratings, product descriptions, and research summaries — is not influenced by affiliate compensation. We only recommend vendors we have vetted for product quality and transparency.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">No Warranties</h2>
          <p>
            This Site is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, express or implied. Aura Protocols makes no representations or warranties regarding the accuracy, completeness, reliability, or suitability of any information on the Site.
          </p>
          <p className="mt-4">
            Product claims, specifications, and availability are the sole responsibility of the respective vendors. Aura Protocols does not manufacture, stock, or fulfill any products listed on this Site.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Aura Protocols and its operators shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of your access to or use of the Site, any linked third-party site, or any content or products obtained through the Site.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Intellectual Property</h2>
          <p>
            All original content on this Site — including written articles, design elements, layout, and branding — is the intellectual property of Aura Protocols. You may not copy, reproduce, distribute, or create derivative works from this content without express written permission.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Prohibited Use</h2>
          <p>You agree not to use this Site to:</p>
          <ul className="mt-3 space-y-2 list-none">
            {[
              "Engage in any unlawful activity or violate any applicable laws or regulations",
              "Scrape, crawl, or harvest content for commercial redistribution",
              "Misrepresent your affiliation with Aura Protocols",
              "Attempt to gain unauthorized access to any part of the Site or its infrastructure",
              "Transmit any malicious code, spam, or disruptive content",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[color:var(--specimen)] flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Governing Law</h2>
          <p>
            These Terms of Service shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes arising under these terms shall be resolved in the appropriate jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Changes to These Terms</h2>
          <p>
            We reserve the right to modify these Terms of Service at any time. Changes will be reflected by updating the &ldquo;Last Updated&rdquo; date at the top of this page. Your continued use of the Site after any changes constitutes your acceptance of the revised terms.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Contact</h2>
          <p>
            If you have questions about these Terms of Service, please reach out via our{" "}
            <a href="/about" className="p-link">About page</a>.
          </p>
        </section>

      </div>
    </main>
  );
}
