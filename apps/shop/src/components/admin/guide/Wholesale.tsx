import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { KIT_VIALS, MIN_KITS_PER_STRENGTH } from "@/lib/wholesale/rules";
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
          <Step>For each strength choose <Ui>Record order</Ui>: pick the <Ui>Supplier</Ui>, add any <Ui>Extra boxes for the shop</Ui>, and enter the <Ui>Total paid to the supplier</Ui> and their order or invoice number. The kits come from the run&apos;s orders. A run uses at most {MAX_SUPPLIERS_PER_RUN} suppliers.</Step>
        </Task>
        <Task title="Receive and link the lot">
          <Step>When the boxes arrive, choose <Ui>Receive lot</Ui> on that strength&apos;s row of the run. The form is filled in from your supplier order (supplier, what you paid, the vials ordered); add the lot number, purity, test date, the certificate and what you counted.</Step>
          <Step>Choose <Ui>Save and link to the run</Ui>. The lot stays a draft, linked to the run, until you pass it. (A lot already received in <Ui>Catalog &amp; lots</Ui> can be attached with <Ui>Link lot</Ui> instead.)</Step>
        </Task>
        <Task title="Pass or fail a strength">
          <Step><Ui>Pass</Ui> puts the lot live and sets aside {KIT_VIALS} vials per kit for every order of the run in the same moment, before any retail checkout can see the lot. Extra boxes become retail stock. When every strength an order needs has passed, the buyer is asked for the balance.</Step>
          <Step><Ui>Fail…</Ui> needs a note (the factory claim). The lot is never sold; buyers with that strength are emailed a new estimated date and can wait or cancel for a full deposit refund. Then choose <Ui>Re-source</Ui> and record the new supplier order.</Step>
        </Task>
        <Task title="Cancel a deposit">
          <Step>On the run, choose <Ui>Cancel deposit…</Ui> on the order, pick a reason and choose <Ui>Cancel and refund</Ui>. The deposit goes back to the card and the buyer is emailed.</Step>
        </Task>
        <Task title="Check what a kit earns">
          <Step>In <Ui>Wholesale</Ui> choose <Ui>Margins</Ui> (owner only). Every strength offered as a kit shows its margin at the lowest and highest volume tier, worked out from today&apos;s retail price, the supplier box prices synced from AIOS and your lot-cost settings.</Step>
          <Step>Use <Ui>Cheapest on file</Ui> or <Ui>Highest on file</Ui> to switch supplier, and <Ui>Kits of each strength in the run</Ui> to see the margin as more kits share that strength&apos;s lot test. Hover a row for the dollars.</Step>
          <Step>Under <Ui>Try an order</Ui>, build an order with <Ui>Add a kit</Ui>, the kit counts and <Ui>Remove</Ui>, or start from one of the examples above it. It shows the order&apos;s profit, margin and profit per vial, with each cost on its own line. This is the worst case for the lab: the order is alone in its run, so it pays every strength&apos;s test.</Step>
          <Step><Ui>Kit price per vial vs competitors</Ui> compares a kit vial at each tier with the cheapest competitor&apos;s single vial of that strength. A minus means the kit is cheaper.</Step>
        </Task>
        <Task title="Turn wholesale off for a customer">
          <Step>In <Ui>Customers</Ui>, open the customer and choose <Ui>Turn off wholesale…</Ui> with a reason. Orders already placed carry on. <Ui>Allow wholesale again</Ui> undoes it.</Step>
        </Task>
        <Task title="Change prices, the minimum or the schedule">
          <Step>In <Ui>Wholesale</Ui> choose <Ui>Settings</Ui>: ordering on or off, the minimum kits per order, the volume tiers, the deposit, the balance days, how often runs close, the next order-by date and the ship estimate. Orders already placed keep their prices.</Step>
          <Step>Which strengths are offered as kits is set in <Ui>Catalog &amp; lots</Ui>: the strength&apos;s ⋯ menu, <Ui>Sell as a wholesale kit</Ui> or <Ui>Stop selling as a kit</Ui>.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Run status", <>Worked out from the date, the strengths and the orders: <Ui>Collecting</Ui> until the order-by date, then <Ui>To order</Ui>, <Ui>In production</Ui>, <Ui>Ready to ship</Ui> and <Ui>Done</Ui>.</>],
          ["The balance", <>Asked for when every strength in the order passes. The buyer pays from their order page; a fresh payment page opens each time. A reminder goes on day {BALANCE_REMINDER_DAY}. On the last day you get an alert that the order cancels tomorrow; the day after, it&apos;s cancelled, the deposit is kept and its vials go back to retail stock.</>],
          ["Paid orders", <>A paid balance moves the order to <Ui>To ship</Ui> in <Ui>Orders</Ui> with its lot already allocated. Ship it as usual. Wholesale orders have their own <Ui>Wholesale</Ui> tab while they&apos;re in production or owe a balance.</>],
          ["Refunds", <>After the balance, <Ui>Refund…</Ui> in <Ui>Orders</Ui> refunds both payments, the deposit and the balance. Sales tax is recorded when the balance is paid.</>],
          ["Margins", <>The page recalculates on every visit. Kit price is the retail vial price × {KIT_VIALS}, less the tier; cost is the supplier box, inbound freight and customs, labels and their application, the kit box, card fees on both charges (GLP-1 kits at the GLP-1 processor&apos;s percent, never Stripe) and the 3PL&apos;s pick, pack, postage and insurance per order, less what the buyer pays for insurance. The lot test, at the default lab&apos;s price for each strength, is absorbed and shared by every kit of that strength in the run. Monthly 3PL fees and receiving aren&apos;t counted.</>],
          ["Where the figures come from", <>Supplier prices, the 3PL, the GLP-1 processor, the lab and competitor prices are kept in AIOS and copied to the store by the price sync; the date of the last sync is at the foot of the page. Competitor prices are single vials, scaled to our strength when they only sell a different size (shown under the price).</>],
          ["Alerts", <>A run still not ordered {days(PAST_CUTOFF_ALERT_DAYS)} after its order-by date, a lot too short to cover its orders, an overdue balance and every forfeit alert you once each.</>],
        ]} />
      }
      watch={[
        <>Link the right lot: check the lot number on the certificate against the boxes before choosing <Ui>Pass</Ui>. Passing can&apos;t be undone.</>,
        <>If one payment of a wholesale order is refunded in the Stripe dashboard you get an alert; refund the order from <Ui>Orders</Ui> so both payments and the stock are handled.</>,
        <>Every strength in an order needs at least {MIN_KITS_PER_STRENGTH} kits, so no lot test is carried by a single kit; the order sheet adds and removes kits of a strength in steps that respect it. An order at the minimum can still be several strengths at {MIN_KITS_PER_STRENGTH} kits each, each paying its own lot test. <Ui>Margins</Ui> with the slider at {MIN_KITS_PER_STRENGTH} shows that worst case.</>,
        <>Keep ordering off in <Ui>Settings</Ui> until the payment processor approves the deposit and balance charges.</>,
      ]}
    />
  );
}
