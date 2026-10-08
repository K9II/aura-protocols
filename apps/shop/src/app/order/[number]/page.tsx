import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/dal";
import { getOrderForCustomer } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";
import OrderCard from "@/components/account/OrderCard";
import ClearCart from "@/components/account/ClearCart";
import RunStrip from "@/components/store/wholesale/RunStrip";
import CancelWholesaleButton from "@/components/store/wholesale/CancelWholesaleButton";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { canCancelWholesale, estimatedDates } from "@/lib/wholesale/rules";
import { currentMs } from "@/lib/clock";
import { dateLabel, localDate } from "@/lib/today/time";
import { usd } from "@/lib/html";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ number: string }>; searchParams: Promise<{ session_id?: string }>;
}) {
  const { number } = await params;
  const { session_id } = await searchParams;
  const customer = await requireCustomer(`/order/${number}`);
  const order = await getOrderForCustomer(number, customer.id);
  if (!order) notFound();
  if (order.channel === "wholesale") return await wholesaleOrder(order);

  // Display only: if the webhook hasn't landed yet, ask Stripe so the page can
  // say "confirming". Only the webhook / reconciler changes the order.
  // A bank payment completes the Stripe page before the money clears, so
  // only payment_status "paid" counts as received.
  let confirming = false;
  let bankPending = false;
  if (order.status === "awaiting_payment" && session_id && session_id === order.stripe_session_id) {
    try {
      const s = await getStripe().checkout.sessions.retrieve(session_id);
      confirming = s.payment_status === "paid";
      bankPending = !confirming && s.status === "complete";
    } catch { confirming = false; }
  }
  const processing = order.status === "processing" || bankPending;
  const closed = order.status === "cancelled" || order.status === "refunded";
  const done = confirming || processing || order.status === "paid" || order.status === "shipped";
  // Sent by us at no charge (seeding, replacement, sample): no receipt, no
  // payment or refund wording, and the customer's cart is left alone.
  const noCharge = order.kind === "no_charge";

  return (
    <div className="pharmacopoeia">
      {done && !noCharge && <ClearCart />}
      <div className="p-container py-16" style={{ maxWidth: 760 }}>
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Order {order.order_number}</p>
        <h1 className="s-h1 mb-6" style={{ fontSize: 48 }}>
          {noCharge ? (closed ? <>Order <em>cancelled.</em></> : <>Sent at <em>no charge.</em></>)
            : closed ? <>Order <em>{order.status}.</em></> : processing ? <>Payment <em>processing.</em></> : done ? <>Thank <em>you.</em></> : <>Awaiting <em>payment.</em></>}
        </h1>
        <p className="text-[15px] text-[color:var(--ink-soft)] mb-6">
          {noCharge ? (closed ? "Cancelled — nothing was charged."
              : order.status === "shipped" ? "Nothing was charged. Your vials are on the way — tracking is below."
              : "Nothing was charged. We'll email you tracking as soon as it ships.")
            : order.status === "cancelled" ? "This order was cancelled and no payment was taken. Your cart is unchanged."
            : order.status === "refunded" ? "This order was refunded. The refund goes back to the way you paid."
            : confirming ? "Payment received — confirming your order now. A confirmation email is on its way."
            : processing ? "Bank payments take a few business days to clear. We'll email you as soon as it does."
            : order.status === "awaiting_payment" ? "We haven't received payment for this order yet."
            : "A confirmation email is on its way. You can follow this order under your account."}
        </p>
        <OrderCard order={order} />
        <Link href="/account" className="p-btn-outline inline-block px-5 py-3 text-sm uppercase tracking-[0.06em] mt-8">My orders →</Link>
      </div>
    </div>
  );
}

// Wholesale (made to order), mocks w6/w7: deposit, balance, the run's dates and
// Cancel until the order-by date. Payment confirmation comes by email (webhook).
async function wholesaleOrder(order: NonNullable<Awaited<ReturnType<typeof getOrderForCustomer>>>) {
  const today = localDate(currentMs());
  let leadDays: number | null = null;
  try { leadDays = (await getWholesaleSettings()).leadDays; } catch (err) { console.error("wholesale settings read failed:", err); }
  const cutoff = order.wholesale_cutoff_on;
  const dates = cutoff && leadDays !== null ? estimatedDates(cutoff, leadDays) : null;
  const deposit = usd(order.deposit_cents ?? 0);
  const closed = order.status === "refunded" || order.status === "cancelled";
  const head = order.status === "deposit_paid" ? <>Deposit <em>received.</em></>
    : order.status === "balance_due" ? <>Balance <em>due.</em></>
    : closed ? <>Order <em>cancelled.</em></>
    : order.status === "awaiting_payment" ? <>Awaiting <em>deposit.</em></>
    : <>Thank <em>you.</em></>;
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16" style={{ maxWidth: 760 }}>
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Order {order.order_number} · wholesale</p>
        <h1 className="s-h1 mb-6" style={{ fontSize: 48 }}>{head}</h1>
        {order.status === "refunded" && <p className="s-ws-lede">Your deposit of {deposit} is being refunded to the way you paid; it can take 5–10 business days to appear.</p>}
        {order.status === "cancelled" && <p className="s-ws-lede">This order was cancelled.</p>}
        {order.status === "awaiting_payment" && <p className="s-ws-lede">We haven&apos;t received your deposit yet. If you just paid, a confirmation email is on its way.</p>}
        {!closed && <OrderCard order={order} />}
        {(order.status === "deposit_paid" || order.status === "balance_due") && (
          <div className="s-ws-sum" style={{ marginTop: 16 }}>
            <div className="s-ws-ln"><span>Deposit paid</span><span>{deposit}</span></div>
            <div className="s-ws-ln"><span>Balance when your lot passes testing</span><span>{usd(order.balance_cents ?? 0)}</span></div>
            <p className="s-ws-note" style={{ margin: "2px 0 12px" }}>Includes {order.shipping_cents ? `${usd(order.shipping_cents)} shipping` : "free shipping"}, {usd(order.insurance_cents)} insurance and sales tax. We&apos;ll email you a link; it&apos;s due within 7 days.</p>
            {cutoff && dates && <RunStrip cutoff={cutoff} testedAbout={dates.testedAbout} shipsAbout={dates.shipsAbout} style={{ margin: 0, background: "var(--paper)" }} />}
          </div>
        )}
        {cutoff && canCancelWholesale(order, today) && <CancelWholesaleButton orderNumber={order.order_number} cutoffLabel={dateLabel(cutoff)} depositLabel={deposit} />}
        <Link href="/account" className="s-ws-btn-o" style={{ marginTop: 14 }}>My orders →</Link>
      </div>
    </div>
  );
}
