import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/dal";
import { getOrderForCustomer } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";
import OrderCard from "@/components/account/OrderCard";
import ClearCart from "@/components/account/ClearCart";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ number: string }>; searchParams: Promise<{ session_id?: string }>;
}) {
  const { number } = await params;
  const { session_id } = await searchParams;
  const customer = await requireCustomer(`/order/${number}`);
  const order = await getOrderForCustomer(number, customer.id);
  if (!order) notFound();

  // Display only: if the webhook hasn't landed yet, ask Stripe so the page can
  // say "confirming". Only the webhook / reconciler changes the order.
  let confirming = false;
  if (order.status === "awaiting_payment" && session_id && session_id === order.stripe_session_id) {
    try {
      const s = await getStripe().checkout.sessions.retrieve(session_id);
      confirming = s.payment_status === "paid" || s.status === "complete";
    } catch { confirming = false; }
  }
  const done = confirming || order.status !== "awaiting_payment";

  return (
    <div className="pharmacopoeia">
      {done && <ClearCart />}
      <div className="p-container py-16" style={{ maxWidth: 760 }}>
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Order {order.order_number}</p>
        <h1 className="s-h1 mb-6" style={{ fontSize: 48 }}>
          {order.status === "processing" ? <>Payment <em>processing.</em></> : done ? <>Thank <em>you.</em></> : <>Awaiting <em>payment.</em></>}
        </h1>
        <p className="text-[15px] text-[color:var(--ink-soft)] mb-6">
          {confirming ? "Payment received — confirming your order now. A confirmation email is on its way."
            : order.status === "processing" ? "Bank payments take a few business days to clear. We'll email you as soon as it does."
            : order.status === "awaiting_payment" ? "We haven't received payment for this order yet."
            : "A confirmation email is on its way. You can follow this order under your account."}
        </p>
        <OrderCard order={order} />
        <Link href="/account" className="p-btn-outline inline-block px-5 py-3 text-sm uppercase tracking-[0.06em] mt-8">My orders →</Link>
      </div>
    </div>
  );
}
