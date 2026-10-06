import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { usd } from "@/lib/html";
import {
  BANK_DECISION_DAYS, DISPUTE_DUE_SOON_DAYS, DISPUTE_FEE_CENTS, DISPUTE_RATE_DAYS, DISPUTE_RATE_REVIEW_PCT, DISPUTE_REMIND_DAYS,
} from "@/lib/disputes/constants";

const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

export default function Disputes() {
  return (
    <Chapter
      id="disputes"
      lede="Chargebacks and early fraud warnings. When a cardholder disputes an order, the evidence is assembled from the records the store keeps: the order, its tracking, the lots shipped, the timestamped sign-up agreement and the Refund & Dispute Policy. You review it and send it to Stripe from here."
      tasks={<>
        <Task title="Respond to a chargeback">
          <Step>You get an alert, and the chargeback shows on <Ui>Today</Ui> and under <Ui>Needs response</Ui>. Choose <Ui>Respond</Ui>.</Step>
          <Step>Read the <Ui>Cover letter</Ui>; it is written for the reason the bank gave. Check the shipping and customer details. Every field can be edited: add what you know, such as the delivery date from the carrier or a message from the customer.</Step>
          <Step>Choose <Ui>Save draft</Ui>. The evidence and its PDF go to Stripe, but the bank sees nothing yet. <Ui>Download PDF</Ui> gives you the same file.</Step>
          <Step>When it&apos;s right, choose <Ui>Submit to Stripe…</Ui>, then <Ui>Submit evidence</Ui>.</Step>
        </Task>
        <Task title="Handle an early fraud warning">
          <Step>A card network&apos;s heads-up that a payment looks fraudulent, often days before a chargeback. It shows under <Ui>Early fraud warnings</Ui> and on <Ui>Today</Ui>.</Step>
          <Step>Not shipped yet: choose <Ui>Cancel and refund…</Ui>. The order is cancelled, its vials go back to stock, the card is refunded and the customer is emailed. Stripe also adds that card to its block list, so it can&apos;t pay at the store again.</Step>
          <Step>Already shipped: choose <Ui>Watch</Ui>. There&apos;s no refund after shipping; if a chargeback follows, its evidence is ready.</Step>
        </Task>
        <Task title="Block a customer">
          <Step>On a chargeback, choose <Ui>Block customer…</Ui>, give a reason and choose <Ui>Block account</Ui>. It&apos;s the same block as in <Ui>Customers</Ui> and doesn&apos;t affect the chargeback response. Nothing is ever blocked automatically.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["What's in the packet", <>The cover letter, the customer&apos;s name and email, the shipping address, carrier, tracking number and date, the products with their lot numbers, the refund policy they agreed to, and a log of the account&apos;s sign-up, agreement, checkout confirmation and payment. The PDF adds the receipt, every lot with its certificate link and the policy excerpts.</>],
          ["Save draft", <>Stores the evidence on the dispute in Stripe without sending it to the bank, so nothing is lost and you can come back to it. Every save and submit is checked first by the same banned-word scan as the website.</>],
          ["Deadlines", <>Stripe sets a deadline for each chargeback. It turns red with {days(DISPUTE_DUE_SOON_DAYS)} or less to go, and you get a reminder alert {DISPUTE_REMIND_DAYS.map(days).join(" and ")} before it while nothing has been submitted. Miss it and the bank decides without your side.</>],
          ["After submitting", <>The bank usually decides within {BANK_DECISION_DAYS[0]} to {BANK_DECISION_DAYS[1]} days. You get an alert with the outcome, and the chargeback moves to History.</>],
          ["Dispute rate", <>Chargebacks opened in the last {DISPUTE_RATE_DAYS} days, out of card payments in the same days. Card networks consider {DISPUTE_RATE_REVIEW_PCT}% excessive and Stripe reviews accounts at that level, so keep it well below.</>],
          ["Customers", <>A customer with a chargeback on any order shows a <Ui>Chargeback</Ui> tag in <Ui>Customers</Ui>.</>],
        ]} />
      }
      watch={[
        <>Submitting is final: the evidence can&apos;t be changed afterwards. Save a draft and read it once more first.</>,
        <>The cover letter says the cardholder didn&apos;t contact us first. Check your inbox before submitting, and change it if they did.</>,
        <>A lost chargeback still costs Stripe&apos;s dispute fee ({usd(DISPUTE_FEE_CENTS)}), on top of the amount.</>,
        <>Refunding a shipped order breaks the no-refund-after-shipping policy and weakens every later chargeback. Refund only before shipping.</>,
        <>Keep research-use-only wording in everything you add. Your edits are checked, and a banned word stops the save.</>,
      ]}
    />
  );
}
