import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import CheckoutForm from "@/components/account/CheckoutForm";
import { requireCustomer } from "@/lib/dal";
import { creditBalance } from "@/lib/partners/ledger";
import { listOpenOrdersForCustomer, releasableCreditCents } from "@/lib/orders";
import { readRef, REF_COOKIE } from "@/lib/partners/ref-cookie";
import { offerForCustomer } from "@/lib/account/offer-data";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const customer = await requireCustomer("/checkout");
  const initialCode = readRef((await cookies()).get(REF_COOKIE)?.value) ?? "";
  // Credit held by this shopper's own abandoned checkout is handed back when
  // they continue (startCheckoutAction releases it first), so show it as available.
  const creditBalanceCents = customer.emailConfirmed
    ? (await creditBalance(customer.id)) + releasableCreditCents(await listOpenOrdersForCustomer(customer.id))
    : 0;
  const newAccountOffer = customer.emailConfirmed ? await offerForCustomer(customer) : null;
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <Link href="/cart" className="p-link text-sm inline-block mb-6">← Back to cart</Link>
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Checkout · signed in as {customer.email}</p>
        <h1 className="s-h1 mb-8" style={{ fontSize: 48 }}>Review your <em>order.</em></h1>
        {customer.emailConfirmed ? (
          <CheckoutForm email={customer.email} ship={customer.ship} initialCode={initialCode} creditBalanceCents={creditBalanceCents} newAccountOffer={newAccountOffer} />
        ) : (
          <p role="alert" className="text-[15px]">Please verify your email address first — we sent a link to {customer.email}. Once verified, come back to this page.</p>
        )}
      </div>
    </div>
  );
}
