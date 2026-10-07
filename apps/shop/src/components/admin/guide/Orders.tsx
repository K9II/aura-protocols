import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { CLEARING_DAYS } from "@/lib/partners/tiers";
import { SHIP_LATE_BUSINESS_DAYS } from "@/lib/today/constants";

export default function Orders() {
  return (
    <Chapter
      id="orders"
      lede="Every order and where it stands. The job here is shipping paid orders; refunds happen in Stripe and show up here by themselves, and chargebacks are answered in Disputes."
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
          <Step>For orders paid by card, wallet or bank, refund in the Stripe dashboard (the order page has <Ui>Open in Stripe</Ui>). A full refund marks the order <Ui>Refunded</Ui> here, reverses the partner commission and returns any store credit the customer used.</Step>
          <Step>For an order paid entirely in store credit, open its page and choose <Ui>Refund to store credit</Ui>. It never went through Stripe, so it can&apos;t be refunded there.</Step>
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
          ["Refunded", <>Fully refunded. The commission is reversed and any store credit used is returned.</>],
        ]} />
      }
      watch={[
        <>Only choose <Ui>Mark shipped</Ui> with a real tracking number: the customer is emailed straight away and it can&apos;t be undone.</>,
        <>A partial refund in Stripe leaves the order and the partner&apos;s commission as they were. You&apos;ll get an alert email; adjust the commission by hand if needed.</>,
        <>Don&apos;t refund the same order in two places. Card orders: Stripe, or <Ui>Cancel and refund</Ui> on an early fraud warning in Disputes. Store-credit-only orders: here only.</>,
        <>The <Ui>Dispute</Ui> and <Ui>Warning</Ui> tags on a row mean a chargeback or an early fraud warning — check Disputes before shipping a <Ui>Warning</Ui> order.</>,
      ]}
    />
  );
}
