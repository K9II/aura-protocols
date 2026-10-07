import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { CLEARING_DAYS, CODE_DISCOUNT_PCT, REF_WINDOW_DAYS } from "@/lib/partners/tiers";
import { NEW_ACCOUNT_PCT } from "@/lib/account/offer";

export default function Partners() {
  return (
    <Chapter
      id="partners"
      lede={`People who send customers to the store with their own code or link. Their customers get ${CODE_DISCOUNT_PCT}% off, and the partner earns commission on what those customers pay.`}
      tasks={<>
        <Task title="Review an application">
          <Step>Go to <Ui>Partners</Ui>. The <Ui>Applications</Ui> tab lists people waiting. Open the partner from the row to read the full application.</Step>
          <Step>Check the channels they listed and how they plan to promote the store.</Step>
          <Step><Ui>Approve</Ui> or <Ui>Decline</Ui>, on the row or on the partner&apos;s page — each asks you to confirm, because each sends an email.</Step>
        </Task>
        <Task title="Suspend or reinstate a partner">
          <Step>Open the partner and choose <Ui>Suspend</Ui>. The dialog shows how much unpaid commission is forfeited. Their code and link stop working at once.</Step>
          <Step>On a suspended partner&apos;s page, <Ui>Reinstate</Ui> switches them back on.</Step>
        </Task>
        <Task title="See a partner's sales and commission">
          <Step>Open the partner&apos;s page: clicks over 30 days, orders, lifetime sales, their tier and how far to the next, payable commission and store credit issued.</Step>
          <Step>The Commissions table lists each order&apos;s state and any adjustments from refunds or chargebacks.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Code or link", <>A customer either types the partner&apos;s code or arrives through their link. A link is remembered for {REF_WINDOW_DAYS} days on that browser.</>],
          ["Customer discount", <>{CODE_DISCOUNT_PCT}% off, but each item still gets only its largest discount. A new account&apos;s {NEW_ACCOUNT_PCT}% wins over it, and the partner still earns commission on the order.</>],
          ["Commission", <>Recorded when the order is paid. It starts a {CLEARING_DAYS}-day hold when the order ships, then becomes payable. A refund or chargeback reverses it.</>],
          ["Commission states", <><Ui>Pending</Ui> until the order ships, <Ui>Clearing</Ui> for {CLEARING_DAYS} days, then <Ui>Payable</Ui>, then <Ui>Paid</Ui>. <Ui>Void</Ui> means the commission was reversed — a refund, a chargeback or a suspension.</>],
          ["Tier", <>The <Ui>Tier</Ui> column is the partner&apos;s current commission rate. It rises with their lifetime sales.</>],
          ["Tax form", <>Partners upload a W-9. Cash can&apos;t be sent until you&apos;ve checked it (see Payouts).</>],
        ]} />
      }
      watch={[
        <>Suspending forfeits the partner&apos;s unpaid commission. Store credit already issued to them stays spendable.</>,
        <>Declining is final; a declined applicant can&apos;t be approved later.</>,
        <>Never post or tell customers the commission rates.</>,
      ]}
    />
  );
}
