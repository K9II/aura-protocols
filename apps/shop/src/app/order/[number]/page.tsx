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
import { orderHasFailedStrength, strengthText } from "@/lib/wholesale/runs";
import { runByCutoff, runLines } from "@/lib/wholesale/runs-data";
import { compoundTitle } from "@/lib/catalog";
import { addDays } from "@/lib/today/time";
import PayBalanceButton from "@/components/store/wholesale/PayBalanceButton";
import { currentMs } from "@/lib/clock";
import { dateLabel, localDate } from "@/lib/today/time";
import { usd } from "@/lib/html";
import { PROTECTION_DECLINED_SHORT, PROTECTION_LABEL } from "@/lib/shipping-protection";
import QuotePay, { type QuotePayItem } from "@/components/store/wholesale/QuotePay";
import QuoteBalanceBank from "@/components/store/wholesale/QuoteBalanceBank";
import { getLiveCatalog } from "@/lib/catalog-live";
import { CLASS_COLOR } from "@/lib/class-colors";
import { depositCutoff, quoteOpen } from "@/lib/wholesale/quote";
import { getBankDetails } from "@/lib/wholesale/quote-data";
import { tierFor } from "@/lib/wholesale/rules";
import type { Customer } from "@/lib/dal";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ number: string }>; searchParams: Promise<{ session_id?: string }>;
}) {
  const { number } = await params;
  const { session_id } = await searchParams;
  const customer = await requireCustomer(`/order/${number}`);
  const order = await getOrderForCustomer(number, customer.id);
  if (!order) notFound();
  if (order.channel === "wholesale" && order.status === "quoted") return await quotePayPage(order, customer, session_id);
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
        {!noCharge && order.protection && (
          <p className="text-[13px] mt-3" style={{ color: order.protection === "declined" ? "var(--specimen)" : "var(--ink-soft)" }}>
            {PROTECTION_LABEL}: {order.protection === "declined" ? PROTECTION_DECLINED_SHORT : `Added (${usd(order.insurance_cents)}). Lost or damaged in transit? We send a replacement.`}
          </p>
        )}
        <Link href="/account" className="p-btn-outline inline-block px-5 py-3 text-sm uppercase tracking-[0.06em] mt-8">My orders →</Link>
      </div>
    </div>
  );
}

// Wholesale (made to order), mocks w6/w7 and b1–b3: deposit received (Cancel
// until the order-by date), a failed strength (keep waiting or cancel for a
// full refund), balance due (Pay balance), balance received, then shipped.
async function wholesaleOrder(order: NonNullable<Awaited<ReturnType<typeof getOrderForCustomer>>>) {
  const today = localDate(currentMs());
  let settings: { leadDays: number; balanceDays: number } | null = null;
  try { settings = await getWholesaleSettings(); } catch (err) { console.error("wholesale settings read failed:", err); }
  const cutoff = order.wholesale_cutoff_on;
  const dates = cutoff && settings ? estimatedDates(cutoff, settings.leadDays) : null;
  const deposit = usd(order.deposit_cents ?? 0);
  const balance = usd(order.balance_cents ?? 0);
  const closed = order.status === "refunded" || order.status === "cancelled";
  // A strength of this order failed testing: shown only while deposit_paid; a
  // failed read hides the notice rather than breaking the page.
  let failed: string[] = [];
  if (order.status === "deposit_paid" && cutoff) {
    try {
      const run = await runByCutoff(cutoff);
      const lines = run ? await runLines(run.id) : [];
      const items = (order.order_items ?? []).map((i) => ({ compound_slug: i.compound_slug, variant_id: i.variant_id, quantity: i.quantity }));
      if (orderHasFailedStrength({ id: order.id, order_number: order.order_number, status: order.status, items }, lines)) {
        failed = (order.order_items ?? []).filter((i) => lines.some((l) => l.slug === i.compound_slug && l.variant_id === i.variant_id && l.result === "failed"))
          .map((i) => `${compoundTitle({ slug: i.compound_slug, name: i.compound_name })} ${strengthText(i.variant_id)}`);
      }
    } catch (err) {
      console.error("wholesale run read failed:", err);
    }
  }
  const dueOn = order.balance_due_at && settings ? addDays(localDate(Date.parse(order.balance_due_at)), settings.balanceDays) : null;
  let bank: Awaited<ReturnType<typeof getBankDetails>> = null;
  if (order.status === "balance_due" && order.quote_pay_bank) {
    try { bank = await getBankDetails(); } catch (err) { console.error("bank details read failed:", err); }
  }
  const newShips = failed.length && settings ? estimatedDates(today, settings.leadDays).shipsAbout : null;
  const head = order.status === "balance_due" ? <>Your kits <em>passed.</em></>
    : failed.length ? <>One lot needs <em>re-sourcing.</em></>
    : order.status === "deposit_paid" ? <>Deposit <em>received.</em></>
    : order.status === "paid" ? <>Balance <em>received.</em></>
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
        {order.status === "balance_due" && <p className="s-ws-lede">Your production lot passed independent testing and your kits are set aside for you. Pay the balance to ship them.</p>}
        {failed.length > 0 && <p className="s-ws-lede">The lot for <b>{failed.join(", ")}</b> didn&apos;t pass our independent testing, so it won&apos;t be sold. We&apos;re re-sourcing it.</p>}
        {order.status === "paid" && <p className="s-ws-lede">Thank you — your kits ship with the lot&apos;s certificate. We&apos;ll email tracking when they&apos;re on the way.</p>}
        {!closed && <OrderCard order={order} />}
        {order.status === "deposit_paid" && (
          <div className="s-ws-sum" style={{ marginTop: 16 }}>
            <div className="s-ws-ln"><span>Deposit paid</span><span>{deposit}</span></div>
            {failed.length > 0 ? <>
              {newShips && <div className="s-ws-ln"><span>New estimated ship date</span><span>{dateLabel(newShips)}</span></div>}
              <p className="s-ws-note" style={{ margin: "6px 0 0" }}>Nothing is needed to keep your order — we&apos;ll email you when the new lot passes.</p>
            </> : <>
              <div className="s-ws-ln"><span>Balance when your lot passes testing</span><span>{balance}</span></div>
              <p className="s-ws-note" style={{ margin: "2px 0 12px" }}>Includes {order.shipping_cents ? `${usd(order.shipping_cents)} shipping` : "free shipping"}, {usd(order.insurance_cents)} shipping protection and sales tax. We&apos;ll email you a link; it&apos;s due within {settings?.balanceDays ?? 7} days.</p>
              {cutoff && dates && <RunStrip cutoff={cutoff} testedAbout={dates.testedAbout} shipsAbout={dates.shipsAbout} style={{ margin: 0 }} />}
            </>}
          </div>
        )}
        {order.status === "balance_due" && (
          <div className="s-ws-sum" style={{ marginTop: 16 }}>
            <div className="s-ws-ln"><span>Deposit paid</span><span>{deposit}</span></div>
            <div className="s-ws-ln b t"><span>Balance due{dueOn ? ` by ${dateLabel(dueOn)}` : ""}</span><span>{balance}</span></div>
            <p className="s-ws-note" style={{ margin: "2px 0 6px" }}>Includes {order.shipping_cents ? `${usd(order.shipping_cents)} shipping` : "free shipping"}, {usd(order.insurance_cents)} shipping protection and sales tax.</p>
            {order.quote_pay_bank && bank && <QuoteBalanceBank orderNumber={order.order_number} amountCents={order.balance_cents ?? 0} bank={bank} transferSent={!!order.transfer_sent_at && order.transfer_sent_for === "balance"} />}
            {(!order.quote_valid_until || order.quote_pay_card) && <PayBalanceButton orderNumber={order.order_number} label={balance} />}
            <p className="s-ws-note" style={{ marginTop: 8 }}>Unpaid orders are cancelled after {dueOn ? dateLabel(dueOn) : "the due date"} and the deposit is kept.</p>
          </div>
        )}
        {order.status === "paid" && (
          <div className="s-ws-sum" style={{ marginTop: 16 }}>
            <div className="s-ws-ln"><span>Deposit</span><span>{deposit}</span></div>
            <div className="s-ws-ln"><span>Balance</span><span>{balance}</span></div>
            <div className="s-ws-ln b t"><span>Paid</span><span>{usd(order.total_cents)}</span></div>
            {cutoff && dates && <div style={{ marginTop: 10 }}><RunStrip cutoff={cutoff} testedAbout={dates.testedAbout} shipsAbout={dates.shipsAbout} style={{ margin: 0 }} /></div>}
          </div>
        )}
        {cutoff && order.deposit_method === "bank" && canCancelWholesale(order, today, { failed: failed.length > 0 }) && (
          <p className="s-ws-note" style={{ marginTop: 14 }}>Your deposit was paid by bank transfer. To cancel before {dateLabel(cutoff)}, reply to your order email and we&apos;ll refund it by bank transfer.</p>
        )}
        {cutoff && order.deposit_method !== "bank" && canCancelWholesale(order, today, { failed: failed.length > 0 }) && (
          <CancelWholesaleButton orderNumber={order.order_number} cutoffLabel={dateLabel(cutoff)} depositLabel={deposit} failedLot={failed.length > 0} />
        )}
        <Link href="/account" className="s-ws-btn-o" style={{ marginTop: 14 }}>My orders →</Link>
      </div>
    </div>
  );
}

// A wholesale quote order waiting for its deposit (mocks 2026-10-17 "Quote Order
// Mocks", screens 4–5): ship to, research use, then bank transfer or card.
async function quotePayPage(order: NonNullable<Awaited<ReturnType<typeof getOrderForCustomer>>>, customer: Customer, sessionId: string | undefined) {
  const today = localDate(currentMs());
  const open = quoteOpen(order, today);
  // Back from the card page before the webhook landed: say "confirming" (display only).
  let confirming = false;
  if (sessionId && sessionId === order.stripe_session_id) {
    try { confirming = (await getStripe().checkout.sessions.retrieve(sessionId)).payment_status === "paid"; } catch { confirming = false; }
  }
  const [settings, live] = await Promise.all([
    getWholesaleSettings().catch((err) => { console.error("wholesale settings read failed:", err); return null; }),
    getLiveCatalog().catch((err) => { console.error("live catalog read failed:", err); return null; }),
  ]);
  const saved = !!order.ruo_confirmed_at && !!order.ship_name;
  let bank: Awaited<ReturnType<typeof getBankDetails>> = null;
  if (saved && order.quote_pay_bank) {
    try { bank = await getBankDetails(); } catch (err) { console.error("bank details read failed:", err); }
  }
  const items = order.order_items ?? [];
  const kits = items.reduce((n, i) => n + i.quantity, 0);
  const sheetPct = settings ? tierFor(kits, settings.tiers).pct : null;
  const rows: QuotePayItem[] = items.map((i) => {
    const c = live?.shown.find((x) => x.slug === i.compound_slug);
    const cls = c?.chemicalClass ?? "";
    return {
      key: i.id, cls, color: CLASS_COLOR[cls as keyof typeof CLASS_COLOR] ?? "var(--ink)",
      title: c?.designation ?? i.compound_name, parts: c?.designation ? i.compound_name : null,
      strength: i.strength, kits: i.quantity, unitCents: i.unit_price_cents, lineCents: i.line_total_cents,
    };
  });
  const sheetCents = sheetPct == null ? 0 : items.reduce((n, i) => n + Math.round((i.retail_unit_cents ?? i.unit_price_cents) * (1 - sheetPct / 100)) * i.quantity, 0);
  const cutoff = order.wholesale_cutoff_on && settings ? depositCutoff(order.wholesale_cutoff_on, today, { runDays: settings.runDays, override: settings.nextCutoffOverride }) : null;
  const dates = cutoff && settings ? estimatedDates(cutoff, settings.leadDays) : null;
  const ship = order.ship_name
    ? { name: order.ship_name, line1: order.ship_line1, line2: order.ship_line2 ?? "", city: order.ship_city, state: order.ship_state, zip: order.ship_zip }
    : customer.ship ? { name: customer.ship.name, line1: customer.ship.line1, line2: customer.ship.line2 ?? "", city: customer.ship.city, state: customer.ship.state, zip: customer.ship.zip }
    : { name: customer.fullName, line1: "", line2: "", city: "", state: "", zip: "" };
  const depositPct = order.subtotal_cents > 0 ? Math.round(((order.deposit_cents ?? 0) / order.subtotal_cents) * 100) : 40;
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Order {order.order_number} · wholesale quote</p>
        <h1 className="s-h1 mb-3">{open ? <>Pay your <em>deposit.</em></> : <>This quote has <em>expired.</em></>}</h1>
        {open
          ? <p className="s-ws-lede" style={{ marginBottom: 26 }}>Your volume price is ready. Add where it ships, then pay the {depositPct}% deposit{cutoff ? <> by <b>{dateLabel(cutoff)}</b></> : null} to hold your place in the run. This quote is good until {dateLabel(order.quote_valid_until!)}.</p>
          : <p className="s-ws-lede">The quote was good until {dateLabel(order.quote_valid_until!)}. Reply to your order email and we&apos;ll set up a new one.</p>}
        {open && (
          <QuotePay
            orderNumber={order.order_number} email={customer.email} note={order.quote_note}
            noteBy={order.quote_note ? `Aura Protocols · ${dateLabel(localDate(Date.parse(order.created_at)))}` : null}
            items={rows}
            money={{ goodsCents: order.subtotal_cents, savedCents: Math.max(0, sheetCents - order.subtotal_cents), shippingCents: order.shipping_cents, protectionCents: order.insurance_cents,
              taxCents: saved ? order.tax_cents : null, depositCents: order.deposit_cents ?? 0, balanceCents: order.balance_cents ?? 0, depositPct }}
            run={cutoff && dates ? { cutoffOn: cutoff, testedAbout: dates.testedAbout, shipsAbout: dates.shipsAbout, cutoffLabel: dateLabel(cutoff) } : null}
            validUntilLabel={dateLabel(order.quote_valid_until!)}
            ship={ship} saved={saved} pay={{ bank: order.quote_pay_bank, card: order.quote_pay_card }} bank={bank}
            transferSent={!!order.transfer_sent_at && order.transfer_sent_for === "deposit"} confirming={confirming}
          />
        )}
        <Link href="/account" className="s-ws-btn-o" style={{ marginTop: 24 }}>My orders →</Link>
      </div>
    </div>
  );
}
