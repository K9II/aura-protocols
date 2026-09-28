import type { Metadata } from "next";
import ProsePage from "@/components/store/ProsePage";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="October 1, 2026"
      sections={[
        { heading: "What we collect", body: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li><b>Entry confirmation</b> — your email, the time you entered, the version of our Terms you accepted, a one-way hash of your IP address, and your browser type. We keep this as the record of your age and research-use confirmation.</li>
            <li><b>Orders</b> — name, shipping address, email, and order contents. Card details are handled by our payment processor; we never see or store full card numbers.</li>
            <li><b>Inquiries</b> — what you send through our wholesale or affiliate forms.</li>
            <li><b>Analytics</b> — anonymous, aggregated page-view data (Vercel Analytics).</li>
          </ul>) },
        { heading: "Cookies", body: <p>We set two first-party cookies when you enter the Site: one records that you accepted the current Terms, the other lets the Site skip the entry screen on later visits. Your cart is stored in your own browser.</p> },
        { heading: "How we use it", body: <p>To fulfil orders, answer inquiries, send order updates, lot certificates and new-lot notices (unsubscribe anytime from any email), keep records needed for payment disputes, and comply with law. We do not sell your personal information.</p> },
        { heading: "Who we share it with", body: <p>Only service providers that run the Site for us — hosting, database, email delivery, payment processing, and shipping carriers — and authorities when legally required.</p> },
        { heading: "Your choices", body: <p>You can unsubscribe from any email, and you can ask us to access or delete your data at <a className="p-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We keep order and entry-confirmation records as long as needed for legal and payment-dispute purposes.</p> },
      ]}
    />
  );
}
