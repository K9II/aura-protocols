import type { Metadata } from "next";
import Link from "next/link";
import { getAccountState } from "@/lib/dal";
import { listOrdersForCustomer } from "@/lib/orders";
import { shortDate } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { SUPPORT_EMAIL } from "@/lib/constants";
import ContactForm from "@/components/store/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about an order, a lot or your account. We reply by email, usually within one business day.",
  alternates: { canonical: "/contact" },
};

// Open without an account (gate-exempt): locked out, unverified or blocked
// visitors can still reach us. Signed-in customers are pre-filled and linked.
export default async function ContactPage() {
  const { customer } = await getAccountState().catch(() => ({ customer: null }));
  const orders = customer
    ? (await listOrdersForCustomer(customer.id)).slice(0, 10).map((o) => ({ number: o.order_number, label: `${o.order_number} · ${shortDate(o.created_at)} · ${usd(o.total_cents)}` }))
    : [];
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16 s-contact">
        <div>
          <p className="s-micro s-eyebrow">Contact</p>
          <h1 className="s-h1 mb-5">Write to <em>us.</em></h1>
          <p className="text-[color:var(--ink-soft)] max-w-[52ch] mb-10">
            Questions about an order, a lot or your account. We reply by email from {SUPPORT_EMAIL}, usually within one business day.
          </p>
          <ContactForm signedIn={customer ? { name: customer.fullName, email: customer.email } : null} orders={orders} />
        </div>
        <aside className="s-contact-aside">
          <div><p className="s-micro mb-1.5">Signed out?</p><p>The form works without an account. Locked out or never got a verification email? Choose <i>Account</i>.</p></div>
          <div><p className="s-micro mb-1.5">Certificates</p><p>Every lot&apos;s certificate is on the <Link href="/coa">COA page</Link>.</p></div>
        </aside>
      </div>
    </div>
  );
}
