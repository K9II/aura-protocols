import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="pharmacopoeia">
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">Legal</p>
      <h1 className="p-serif text-4xl mb-3 text-[color:var(--ink)]">Privacy Policy</h1>
      <p className="text-sm text-[color:var(--ink-soft)] mb-10">Last Updated: April 12, 2026</p>

      <div className="space-y-8 text-[color:var(--ink-soft)] leading-relaxed">

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Introduction</h2>
          <p>
            Aura Protocols (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to transparency in all aspects of how we operate, including how we handle your data. This Privacy Policy explains what information is collected when you visit{" "}
            <span className="text-[color:var(--ink)]">auraprotocols.com</span>, how it is used, and your rights with respect to that information.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Information We Collect</h2>
          <p>
            We do not directly collect personal information such as your name, email address, or payment details. We do not operate account registration, newsletter sign-up, or any form-based data collection on this site.
          </p>
          <p className="mt-4">
            Vercel, our hosting provider, may automatically collect anonymized technical data including IP addresses, browser type, referring URLs, and pages visited for the purpose of site performance monitoring and security. This data is handled according to{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="p-link"
            >
              Vercel&rsquo;s Privacy Policy
            </a>.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Affiliate Links &amp; Third-Party Tracking</h2>
          <p>
            This site contains affiliate links to third-party vendor websites. When you click one of these links, you are redirected to an external site operated by that vendor. The vendor may set cookies or use other tracking technologies to attribute your visit and any resulting purchase to Aura Protocols for commission purposes.
          </p>
          <p className="mt-4">
            We do not have access to or control over the tracking data collected by third-party vendors. Our current affiliate partners include Limitless Life Nootropics and Apollo Peptide Sciences. We encourage you to review the privacy policies of any vendor site you visit.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Cookies</h2>
          <p>
            Aura Protocols does not set first-party cookies. When you click an affiliate link, the destination vendor may set cookies on your device to track your referral session. These cookies are governed by the vendor&rsquo;s own cookie and privacy policies.
          </p>
          <p className="mt-4">
            You may disable cookies at any time through your browser settings. Note that disabling cookies may affect the ability of affiliate commissions to be properly attributed, but will not affect your ability to browse this site.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Third-Party Links</h2>
          <p>
            This site contains links to external websites that are not operated by Aura Protocols. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party sites. We strongly advise you to review the privacy policy of every site you visit.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Children&rsquo;s Privacy</h2>
          <p>
            This site is not directed at individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us and we will take steps to remove it.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The &ldquo;Last Updated&rdquo; date at the top of this page reflects the most recent revision. Continued use of the site after any changes constitutes your acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="p-serif text-xl mt-10 mb-3 text-[color:var(--ink)]">Contact</h2>
          <p>
            If you have questions or concerns about this Privacy Policy, please reach out via our{" "}
            <a href="/about" className="p-link">About page</a>.
          </p>
        </section>

      </div>
    </div>
    </main>
  );
}
