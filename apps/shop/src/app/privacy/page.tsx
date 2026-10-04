import type { Metadata } from "next";
import PolicyPage from "@/components/store/PolicyPage";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

// Requires legal review before launch.
export default function PrivacyPage() {
  const mail = <a className="p-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  return (
    <PolicyPage
      policy="privacy"
      title={<>Privacy <em>Policy.</em></>}
      updated="October 2, 2026"
      summary={{
        headline: <>We collect what we need to confirm entry, run your account, and fulfil your orders &mdash; and we never sell it.</>,
        detail: <>Card details go straight to our payment processor; we never see or store full card numbers.</>,
      }}
      sections={[
        { id: "collect", heading: "What we collect", body: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li><b>Entry confirmation</b> &mdash; the time you entered, the version of our Terms you accepted, a one-way hash of your IP address, and your browser type. This is our record of your age and research-use confirmation.</li>
            <li><b>Account</b> &mdash; your name, email, optional organization, and the agreements you accepted, with their version and time.</li>
            <li><b>Orders</b> &mdash; shipping address, order contents and lot numbers, and the research-use confirmation you give with each order.</li>
            <li><b>Payments</b> &mdash; processed by Stripe. We receive the payment status and method type, never full card or bank numbers.</li>
            <li><b>Inquiries</b> &mdash; what you send through our wholesale or affiliate forms.</li>
            <li><b>Analytics</b> &mdash; anonymous, aggregated page-view data (Vercel Analytics).</li>
          </ul>
        ) },
        { id: "cookies", heading: "Cookies and browser storage", body: (
          <p>When you enter the Site we set two first-party cookies: a signed one recording that you accepted the current Terms, and a readable one that lets the Site skip the entry screen on later visits. Signing in adds a sign-in session cookie. Your cart is kept in your own browser&apos;s storage.</p>
        ) },
        { id: "use", heading: "How we use it", body: (
          <p>To fulfil and support your orders; to send order, shipping, and account emails; to send promotions, research news and new-lot notices if you opt in (unsubscribe any time from any such email); to keep the records we need for tax, legal, and payment-dispute purposes; and to comply with the law. We do not sell your personal information.</p>
        ) },
        { id: "sharing", heading: "Who we share it with", body: (
          <p>Only the service providers that run the Site and your orders for us &mdash; hosting (Vercel), database and sign-in (Supabase), email delivery (Amazon SES), payments (Stripe), our fulfillment partner, and shipping carriers &mdash; and authorities when the law requires it.</p>
        ) },
        { id: "retention", heading: "How long we keep it", body: (
          <p>Order, payment, and agreement records are kept as long as needed for tax, legal, and payment-dispute purposes. Other information is deleted when you ask us to, or when we no longer need it.</p>
        ) },
        { id: "choices", heading: "Your choices", body: (
          <p>You can unsubscribe from any marketing email using its link. To access or delete your information, email {mail}; we will confirm your identity before acting and tell you if a record must be kept for one of the reasons above.</p>
        ) },
      ]}
    />
  );
}
