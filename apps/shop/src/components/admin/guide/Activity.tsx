import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { ACTIVITY_PAGE } from "@/lib/audit/constants";

export default function Activity() {
  return (
    <Chapter
      id="activity"
      lede="One list of everything done in the command center: who did it, what it was about, and when. Use it to answer “who changed this?” without opening each page."
      tasks={<>
        <Task title="Find who did something">
          <Step>Open <Ui>Activity</Ui> in the menu. The newest actions are at the top.</Step>
          <Step>Pick an area (for example <Ui>Orders</Ui> or <Ui>Discounts</Ui>) to narrow the list. Choose a period: <Ui>Today</Ui>, <Ui>7 days</Ui> or <Ui>30 days</Ui>, or <Ui>Dates</Ui> to pick <Ui>From</Ui> and <Ui>To</Ui> (whole days, shop time; either can be left empty). To see one person, choose a name under <Ui>Person</Ui> and <Ui>Show</Ui>. <Ui>Clear</Ui> removes the filters.</Step>
          <Step><Ui>Open</Ui> goes to the order, customer, code or product the action was about. <Ui>Older</Ui> shows the next {ACTIVITY_PAGE}.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["What's recorded", <>Orders shipped and refunded; customer blocks, store credit and verification emails; discount codes, batches and the cap; lots, counts, prices and strengths; email campaigns, drafts and automations; dispute evidence and early-warning choices; partner approvals and payouts; every time a W-9 is opened; alerts marked done; team sign-outs, disables and enables.</>],
          ["Where it comes from", <>Each module keeps its own log, which also shows on its page. Activity reads all of them together. Nothing here can be edited or deleted from the admin.</>],
          ["W-9s", <>A W-9 holds a tax ID. Opening one is recorded first; if that record can&apos;t be saved, the W-9 doesn&apos;t open.</>],
          ["Times", <>Shown in shop time (Mountain).</>],
        ]} />
      }
      watch={[
        <>Automatic work (Stripe events, the daily runs, the 3PL) isn&apos;t listed here. It shows on each module&apos;s page, such as a dispute&apos;s <Ui>Activity</Ui> card.</>,
        <>Changes made outside the command center aren&apos;t here either. A refund made in the Stripe dashboard is recorded on the order, but who made it is in Stripe&apos;s own log.</>,
      ]}
    />
  );
}
