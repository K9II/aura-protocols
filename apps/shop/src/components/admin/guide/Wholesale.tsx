import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { KIT_VIALS, QUOTE_REPLY_HOURS, VOLUME_NUDGE_MIN_KITS, VOLUME_QUOTE_MIN_KITS } from "@/lib/wholesale/rules";
import { BALANCE_REMINDER_DAY, MAX_SUPPLIERS_PER_RUN, PAST_CUTOFF_ALERT_DAYS } from "@/lib/wholesale/runs";
import { REVIEW_WARN_DAYS } from "@/lib/wholesale/review";
import { QUOTE_BANDS, QUOTE_MAX_VALID_DAYS, QUOTE_VALID_DAYS } from "@/lib/wholesale/quote";

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
        <Task title="Review a new wholesale buyer">
          <Step>A buyer&apos;s first paid deposit shows on <Ui>Today</Ui> under <Ui>Wholesale</Ui> as <Ui>New wholesale buyer</Ui>, with their email, field of research, kits and deposit. Look them up (organization, website, the email domain).</Step>
          <Step>If they look right, choose <Ui>Reviewed</Ui>. If not, open the run (the order number) and choose <Ui>Cancel deposit…</Ui> on their order for a full refund.</Step>
        </Task>
        <Task title="Check what a kit earns">
          <Step>In <Ui>Wholesale</Ui> choose <Ui>Margins</Ui> (owner only). Every strength offered as a kit shows its margin at the lowest and highest volume tier, worked out from today&apos;s retail price, the supplier box prices synced from AIOS and your lot-cost settings.</Step>
          <Step>Use <Ui>Cheapest on file</Ui> or <Ui>Highest on file</Ui> to switch supplier, and <Ui>Kits of each strength in the run</Ui> to see the margin as more kits share that strength&apos;s lot test. Hover a row for the dollars.</Step>
          <Step>Under <Ui>Try an order</Ui>, build an order with <Ui>Add a kit</Ui>, the kit counts and <Ui>Remove</Ui>, or start from one of the examples above it. It shows the order&apos;s profit, margin and profit per vial, with each cost on its own line. This is the worst case for the lab: the order is alone in its run, so it pays every strength&apos;s test.</Step>
          <Step><Ui>Kit price per vial vs competitors</Ui> compares a kit vial at each tier with the cheapest competitor&apos;s single vial of that strength. A minus means the kit is cheaper.</Step>
        </Task>
        <Task title="Answer a volume quote request">
          <Step>Orders of {VOLUME_QUOTE_MIN_KITS} or more kits are invited to ask for a quote: the wholesale page shows a <Ui>Volume quote</Ui> card next to the tiers, and from {VOLUME_NUDGE_MIN_KITS} kits the buyer&apos;s order summary counts down to it. <Ui>Ask for a volume quote</Ui> copies their kits into the inquiry form, so the request arrives in <Ui>Inquiries</Ui> (topic Wholesale) starting &ldquo;Volume quote request&rdquo;.</Step>
          <Step>Once they press <Ui>Send</Ui>, their order sheet is cleared and a <Ui>Quote requested</Ui> page tells them what happens next: you price it within {QUOTE_REPLY_HOURS} hours, they reply yes, then you email a link to pay the deposit. It shows their Q-number and which run the order would join. If they edited the request before sending, they get the form&apos;s thank-you line instead.</Step>
          <Step>Price it in AIOS: <Ui>Aura Shop</Ui> → <Ui>Kits</Ui> → <Ui>Volume quote</Ui>. Add each strength and its kits; <Ui>Quote at</Ui> <Ui>Volume tier</Ui> gives the volume price, never below the floor it shows. Choose <Ui>Copy quote</Ui> and paste it into your reply.</Step>
        </Task>
        <Task title="Turn an accepted quote into an order">
          <Step>When the customer says yes, open the inquiry and choose <Ui>Create quote order</Ui>. (The inquiry must be linked to their account, with wholesale on.) Without an inquiry, use <Ui>Orders</Ui> → <Ui>New quote order</Ui> and pick the customer.</Step>
          <Step>The kits are copied from the inquiry, each line at the volume-quote band for the request&apos;s total kits ({QUOTE_BANDS.map((b, i) => `${b.minKits}${QUOTE_BANDS[i + 1] ? `–${QUOTE_BANDS[i + 1].minKits - 1}` : "+"} kits ${b.pct}%`).join(", ")} off retail — the same bands as AIOS). Type the percent you quoted on each line (or <Ui>Set every line to</Ui> … <Ui>Apply</Ui>); <Ui>Add a strength…</Ui> adds one the inquiry didn&apos;t name. <Ui>Quote</Ui> on the right shows the total and the deposit; <Ui>Estimated profit</Ui> is for you only.</Step>
          <Step>Pick the <Ui>Run</Ui>, check the <Ui>Deposit</Ui> and <Ui>Quote valid until</Ui> (default {QUOTE_VALID_DAYS} days), tick how they can pay — <Ui>Bank transfer</Ui>, <Ui>Card</Ui> or both — and add a note if you like. Choose <Ui>Create order and email the customer</Ui>. Nothing is charged; the order waits as <Ui>Awaiting deposit</Ui> under <Ui>Orders</Ui> → <Ui>Wholesale</Ui>, and the customer gets a link to their order page.</Step>
        </Task>
        <Task title="Record a bank transfer">
          <Step>When a deposit or balance reaches the business account, open the order and choose <Ui>Record bank transfer…</Ui>. Check the amount, the day it arrived and the bank&apos;s reference, then <Ui>Record deposit</Ui> (or <Ui>Record balance</Ui>).</Step>
          <Step>A deposit moves the order to <Ui>Deposit paid</Ui> and into its run; a balance moves it to <Ui>To ship</Ui>. The customer gets a receipt either way. If the customer pressed <Ui>I&apos;ve sent the transfer</Ui>, you were emailed and the order&apos;s <Ui>Quote</Ui> card says so.</Step>
        </Task>
        <Task title="Set up the bank details">
          <Step>In <Ui>Wholesale</Ui> → <Ui>Settings</Ui>, fill in <Ui>Bank transfer</Ui>: account name, bank, routing number and account number, plus an optional note. Until all four are set, quote orders can only be paid by card.</Step>
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
          ["Quote orders", <>Priced line by line at the percent off retail you type, never from the order sheet. The deposit is a share of the kits; sales tax is added when the customer enters their address on their order page, and carried in the balance. A deposit that lands after the run&apos;s order-by date joins the run open that day. A quote not paid by its valid-until date (at most {QUOTE_MAX_VALID_DAYS} days out) is cancelled overnight and you get an alert. Card is never offered on an order with an incretin or amylin analog.</>],
          ["Bank transfers", <>Bank details show to the customer only after they&apos;ve entered their address and confirmed research use, with the order number as the reference. Recording a transfer records no card fee, so profit is exact. A deposit paid by bank transfer can&apos;t be cancelled by the customer; <Ui>Cancel deposit…</Ui> on the run marks it refunded and you send the money back by bank transfer yourself.</>],
          ["Alerts", <>A run still not ordered {days(PAST_CUTOFF_ALERT_DAYS)} after its order-by date, a lot too short to cover its orders, an overdue balance and every forfeit alert you once each.</>],
          ["New buyers", <>Reviewed once per buyer, never per order: later orders from a reviewed buyer don&apos;t show. The line turns red {days(REVIEW_WARN_DAYS)} before the run&apos;s order-by date. The run page lists unreviewed buyers next to <Ui>Record order</Ui>, but never blocks it.</>],
        ]} />
      }
      watch={[
        <>Link the right lot: check the lot number on the certificate against the boxes before choosing <Ui>Pass</Ui>. Passing can&apos;t be undone.</>,
        <>If one payment of a wholesale order is refunded in the Stripe dashboard you get an alert; refund the order from <Ui>Orders</Ui> so both payments and the stock are handled.</>,
        <>The minimum is per order, not per strength: an order at the minimum can be all different strengths, each paying its own lot test. <Ui>Margins</Ui> with the slider at 1 shows that worst case.</>,
        <>Keep ordering off in <Ui>Settings</Ui> until the payment processor approves the deposit and balance charges.</>,
        <>The site never shows the volume discount; it&apos;s only in your quotes. Quote from the AIOS helper so every price is above its floor.</>,
        <>Only record a bank transfer once the money is in the account — recording it starts the order and emails the customer a receipt.</>,
        <>Review new buyers before <Ui>Record order</Ui>: after that you&apos;ve paid the supplier for their kits.</>,
      ]}
    />
  );
}
