import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { CLEARING_DAYS } from "@/lib/partners/tiers";
import { SHIP_LATE_BUSINESS_DAYS } from "@/lib/today/constants";
import { NO_CHARGE_MAX_VIALS } from "@/lib/no-charge/rules";
import { REFUND_NOTE_MAX, REFUND_REASONS, REFUND_REASON_LABEL } from "@/lib/refunds/rules";

const reasons = REFUND_REASONS.map((r) => REFUND_REASON_LABEL[r]);

export default function Orders() {
  return (
    <Chapter
      id="orders"
      lede="Every order and where it stands. The job here is shipping paid orders and, when the policy allows, refunding them; chargebacks are answered in Disputes."
      tasks={<>
        <Task title="Ship a paid order">
          <Step>Go to <Ui>Orders</Ui>. The <Ui>To ship</Ui> tab lists paid orders, oldest first. One waiting more than {SHIP_LATE_BUSINESS_DAYS} business days turns red.</Step>
          <Step>Choose <Ui>Pick list</Ui> to see exactly which lots to pack for each line, and pack those lots.</Step>
          <Step>Once the label is printed, choose <Ui>Ship</Ui>, pick the carrier, type the <Ui>Tracking number</Ui> and choose <Ui>Mark shipped</Ui>. You can do this from the list or from the order&apos;s page.</Step>
          <Step>The customer is emailed their tracking at once, and any partner commission on the order starts its {CLEARING_DAYS}-day hold.</Step>
        </Task>
        <Task title="Look up an order">
          <Step>Type an order number, email, name or tracking number in the search box. It looks across every order, whatever tab you&apos;re on.</Step>
          <Step>Click the order number to open its page: items and the lots held and shipped, the money breakdown, the customer, any code or partner, and a timeline of everything that happened to it.</Step>
        </Task>
        <Task title="Refund an order">
          <Step>Before it ships: open the order and choose <Ui>Cancel and refund</Ui> (on a phone it&apos;s under <Ui>⋯</Ui>). Pick a reason — {reasons.join(", ")} — add a note if you like, and confirm.</Step>
          <Step>The card part goes back to the card through Stripe, store credit the customer used goes back to their balance, the vials go back in stock, any partner commission is reversed, and the customer gets the &ldquo;cancelled and refunded&rdquo; email. An order paid entirely in store credit goes back to store credit.</Step>
          <Step>After it ships, the policy says the sale is final. For damage or loss, open <Ui>⋯</Ui> and choose <Ui>Send a replacement</Ui> — it opens a no-charge order with the replacement and the original order filled in.</Step>
          <Step><Ui>Refund…</Ui> under <Ui>⋯</Ui> is for rare exceptions. A note is required (up to {REFUND_NOTE_MAX} characters), it goes to store credit unless you choose the card, the vials stay out of stock, and you tick the box that confirms the exception. Sending the money back to the card (a cash refund) adds a second box: you confirm you understand the policy — after shipping, claims are settled by replacement only, no cash refunds. The customer gets a &ldquo;refunded&rdquo; email with the amount and where it went.</Step>
        </Task>
        <Task title="Send vials at no charge">
          <Step>Go to <Ui>Orders</Ui> and choose <Ui>New no-charge order</Ui>. Find the customer by name or email — they need an account, so their 21+ and research-use agreement is on record.</Step>
          <Step>Pick <Ui>Seeding</Ui>, <Ui>Replacement</Ui>, <Ui>Sample</Ui> or <Ui>Other</Ui>. A replacement asks for the original order and a note saying what happened; <Ui>Other</Ui> needs a note too.</Step>
          <Step>Add the items and how many vials of each, check the address, and choose whether to email the customer that it&apos;s on its way (no prices in that email).</Step>
          <Step>Choose <Ui>Create order</Ui>. The vials are taken from stock at once and the order appears in <Ui>To ship</Ui> with a <Ui>No charge</Ui> tag. Pick, pack and ship it as usual; the tracking email follows.</Step>
        </Task>
        <Task title="Answer a chargeback">
          <Step>You&apos;ll get an alert when one opens. Open <Ui>Disputes</Ui>: the evidence is already assembled from the order, its tracking and the customer&apos;s sign-up agreement. Review it and submit it to Stripe there.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Tabs", <><Ui>To ship</Ui> is paid orders; <Ui>Processing</Ui> is bank payments still clearing; <Ui>Closed</Ui> is refunded and cancelled orders; <Ui>All</Ui> is everything that reached payment.</>],
          ["Awaiting payment", <>The customer is on the payment page. If they leave, the order is cancelled when they start a new checkout or the payment page expires.</>],
          ["Processing", <>Paid by bank transfer (ACH), which takes a few days to clear. Don&apos;t ship yet.</>],
          ["Paid", <>Money received. Ready to pack and ship.</>],
          ["Shipped", <>Tracking entered and the customer emailed. From here an order can only be refunded.</>],
          ["Cancelled", <>An unfinished checkout that was closed. No money moved.</>],
          ["Refunded", <>Fully refunded. The commission is reversed and any store credit used is returned. The order page shows a <Ui>Refund</Ui> card — amount, where it went, the reason and who did it — and the timeline reads <Ui>Cancelled and refunded</Ui> or <Ui>Refunded — exception</Ui>.</>],
          ["No-charge orders", <>Every price is $0; the retail value is kept on the order for the record. It isn&apos;t a sale: Today, Discounts, Email results and Customers leave it out. No partner commission, and it doesn&apos;t use the customer&apos;s first-order offer. A cancelled one reads <Ui>Cancelled (no charge)</Ui>.</>],
        ]} />
      }
      watch={[
        <>Only choose <Ui>Mark shipped</Ui> with a real tracking number: the customer is emailed straight away and it can&apos;t be undone.</>,
        <>An order with an open chargeback or an early fraud warning is refunded from <Ui>Disputes</Ui>, not here — the order page points you there. An order whose chargeback was lost is never refunded: the bank already returned the money.</>,
        <>A refund made in the Stripe dashboard still marks the order <Ui>Refunded</Ui> here, but there&apos;s no reason or note on record (the money line says &ldquo;in Stripe&rdquo; and the timeline <Ui>Refunded in Stripe</Ui>). Refund here instead.</>,
        <>Partial refunds aren&apos;t supported here. A partial refund made in Stripe leaves the order and the partner&apos;s commission as they were; you&apos;ll get an alert email — adjust the commission by hand if needed.</>,
        <><Ui>Cancel order</Ui> on a no-charge order works only before it ships; it puts the vials back in stock and emails no one.</>,
        <>If a no-charge order&apos;s timeline shows <Ui>Email failed</Ui>, the &ldquo;on its way&rdquo; email didn&apos;t go (you also get an alert) — let the customer know yourself. If <Ui>Create order</Ui> says <Ui>Nothing was sent</Ui>, no order went to To ship; just try again.</>,
        <>Hidden strengths of shown products can be sent at no charge (tagged <Ui>Hidden</Ui> in the list); hidden products and archived strengths can&apos;t.</>,
        <>A no-charge order takes at most {NO_CHARGE_MAX_VIALS} vials per item — a guard against typos. Need more? Add a second order.</>,
        <>The <Ui>Dispute</Ui> and <Ui>Warning</Ui> tags on a row mean a chargeback or an early fraud warning — check Disputes before shipping a <Ui>Warning</Ui> order.</>,
      ]}
    />
  );
}
