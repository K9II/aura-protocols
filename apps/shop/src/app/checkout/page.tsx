import type { Metadata } from "next";
import CheckoutForm from "@/components/account/CheckoutForm";
import { requireCustomer } from "@/lib/dal";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const customer = await requireCustomer("/checkout");
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Checkout · signed in as {customer.email}</p>
        <h1 className="s-h1 mb-8" style={{ fontSize: 48 }}>Review your <em>order.</em></h1>
        {customer.emailConfirmed ? (
          <CheckoutForm email={customer.email} ship={customer.ship} />
        ) : (
          <p role="alert" className="text-[15px]">Please verify your email address first — we sent a link to {customer.email}. Once verified, come back to this page.</p>
        )}
      </div>
    </div>
  );
}
