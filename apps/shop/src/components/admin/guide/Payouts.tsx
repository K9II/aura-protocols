import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { CASH_MIN_CENTS, CREDIT_MULTIPLIER } from "@/lib/partners/tiers";

const CASH_MIN = `$${CASH_MIN_CENTS / 100}`;

export default function Payouts() {
  return (
    <Chapter
      id="payouts"
      lede="Paying partners their cleared commission. Store credit is added automatically; cash is sent by you, by hand, from this page."
      tasks={<>
        <Task title="Send a cash payout">
          <Step>On the 1st and 15th you&apos;ll get an email listing the cash to send. Go to <Ui>Payouts</Ui>; the <Ui>To send</Ui> tab lists what&apos;s queued.</Step>
          <Step>Click the code to see that partner&apos;s commission first, then choose <Ui>Show full details</Ui> and send the amount from your bank (ACH) or Zelle.</Step>
          <Step>Type the payment&apos;s reference in <Ui>Reference</Ui> and choose <Ui>Mark paid</Ui>. The partner is emailed a receipt.</Step>
        </Task>
        <Task title="Check a W-9">
          <Step>Under &quot;W-9s waiting for your check&quot;, choose <Ui>Open W-9</Ui>.</Step>
          <Step>Check the name, tax number and signature are filled in and match the partner, then choose <Ui>Mark checked</Ui>.</Step>
        </Task>
        <Task title="Check what was paid">
          <Step>The <Ui>History</Ui> tab lists every paid and credited payout with its reference.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Payout days", <>Payouts run automatically on the 1st and 15th. Each partner chose cash, store credit or a split.</>],
          ["Store credit", <>Added to the partner&apos;s account straight away, worth {CREDIT_MULTIPLIER}× the commission.</>],
          ["Cash", <>Sent only when it&apos;s at least {CASH_MIN} and the partner&apos;s W-9 is checked. Otherwise it&apos;s carried to the next run.</>],
          ["Bank details", <>Stored encrypted and shown only here, behind <Ui>Show full details</Ui>.</>],
        ]} />
      }
      watch={[
        <>Nothing is sent automatically. Money only moves when you send it.</>,
        <>If a payout says its details changed since it was queued, confirm with the partner before sending. It can be a sign of a hacked account.</>,
        <>A &quot;Payout run needs attention&quot; box means a run didn&apos;t finish. Don&apos;t send anything for that run until it&apos;s sorted out.</>,
      ]}
    />
  );
}
