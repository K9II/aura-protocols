import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { KIT_VIALS } from "@/lib/wholesale/rules";
import { BALANCE_REMINDER_DAY, MAX_SUPPLIERS_PER_RUN, PAST_CUTOFF_ALERT_DAYS } from "@/lib/wholesale/runs";

const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

export default function Wholesale() {
  return (
    <Chapter
      id="wholesale"
      lede={`Made-to-order research kits of ${KIT_VIALS} vials of one strength. Buyers pay a deposit; their orders collect in a production run until its order-by date. You order from the supplier, receive and test one lot per strength, then the buyers pay the balance and the kits ship. Nothing is taken from retail stock at checkout.`}
      tasks={<>
        <Task title="Order a run from the supplier">
          <Step>After the order-by date the run shows <Ui>To order</Ui> on <Ui>Today</Ui> and in <Ui>Wholesale</Ui>. Open the run.</Step>
          <Step>For each strength choose <Ui>Record order</Ui>: the supplier, any <Ui>Extra retail boxes</Ui>, the cost and the supplier&apos;s reference. The kits come from the run&apos;s orders. A run uses at most {MAX_SUPPLIERS_PER_RUN} suppliers.</Step>
        </Task>
        <Task title="Receive and link the lot">
          <Step>When the boxes arrive, receive them in <Ui>Catalog &amp; lots</Ui> as usual and add the certificate. The lot stays a draft.</Step>
          <Step>Back on the run, choose <Ui>Link lot</Ui> and pick that draft lot.</Step>
        </Task>
        <Task title="Pass or fail a strength">
          <Step><Ui>Pass</Ui> puts the lot live and sets aside {KIT_VIALS} vials per kit for every order of the run in the same moment, before any retail checkout can see the lot. Extra boxes become retail stock. When every strength an order needs has passed, the buyer is asked for the balance.</Step>
          <Step><Ui>Fail…</Ui> needs a note (the factory claim). The lot is never sold; buyers with that strength are emailed a new estimated date and can wait or cancel for a full deposit refund. Then choose <Ui>Re-source</Ui> and record the new supplier order.</Step>
        </Task>
        <Task title="Cancel a deposit">
          <Step>On the run, choose <Ui>Cancel deposit…</Ui> on the order, pick a reason and choose <Ui>Cancel and refund</Ui>. The deposit goes back to the card and the buyer is emailed.</Step>
        </Task>
        <Task title="Turn wholesale off for a customer">
          <Step>In <Ui>Customers</Ui>, open the customer and choose <Ui>Turn off wholesale…</Ui> with a reason. Orders already placed carry on. <Ui>Allow wholesale again</Ui> undoes it.</Step>
        </Task>
        <Task title="Change prices, the minimum or the schedule">
          <Step>In <Ui>Wholesale</Ui> choose <Ui>Settings</Ui>: ordering on or off, the minimum kits, the volume tiers, the deposit, the balance days, how often runs close, the next order-by date and the ship estimate. Orders already placed keep their prices.</Step>
          <Step>Which strengths are offered as kits is set in <Ui>Catalog &amp; lots</Ui>: the strength&apos;s ⋯ menu, <Ui>Sell as a wholesale kit</Ui> or <Ui>Stop selling as a kit</Ui>.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Run status", <>Worked out from the date, the strengths and the orders: <Ui>Collecting</Ui> until the order-by date, then <Ui>To order</Ui>, <Ui>In production</Ui>, <Ui>Ready to ship</Ui> and <Ui>Done</Ui>.</>],
          ["The balance", <>Asked for when every strength in the order passes. The buyer pays from their order page; a fresh payment page opens each time. A reminder goes on day {BALANCE_REMINDER_DAY}. On the last day you get an alert that the order cancels tomorrow; the day after, it&apos;s cancelled, the deposit is kept and its vials go back to retail stock.</>],
          ["Paid orders", <>A paid balance moves the order to <Ui>To ship</Ui> in <Ui>Orders</Ui> with its lot already allocated. Ship it as usual. Wholesale orders have their own <Ui>Wholesale</Ui> tab while they&apos;re in production or owe a balance.</>],
          ["Refunds", <>After the balance, <Ui>Refund…</Ui> in <Ui>Orders</Ui> refunds both payments, the deposit and the balance. Sales tax is recorded when the balance is paid.</>],
          ["Alerts", <>A run still not ordered {days(PAST_CUTOFF_ALERT_DAYS)} after its order-by date, a lot too short to cover its orders, an overdue balance and every forfeit alert you once each.</>],
        ]} />
      }
      watch={[
        <>Link the right lot: check the lot number on the certificate against the boxes before choosing <Ui>Pass</Ui>. Passing can&apos;t be undone.</>,
        <>If one payment of a wholesale order is refunded in the Stripe dashboard you get an alert; refund the order from <Ui>Orders</Ui> so both payments and the stock are handled.</>,
        <>Keep ordering off in <Ui>Settings</Ui> until the payment processor approves the deposit and balance charges.</>,
      ]}
    />
  );
}
