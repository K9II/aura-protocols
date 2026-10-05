import { Chapter, Example, P, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { EXAMPLE_CODE, EXAMPLE_CODE_PCT, vipExample } from "@/components/admin/guide/example";
import { NEW_ACCOUNT_PCT } from "@/lib/account/offer";
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function Discounts({ capPct }: { capPct: number }) {
  const ex = vipExample(capPct);
  return (
    <Chapter
      id="discounts"
      lede={`Codes customers type at checkout. Pack prices, the new-account ${NEW_ACCOUNT_PCT}% and partner links are automatic. They aren't codes and aren't listed here, but a code competes with them.`}
      tasks={<>
        <Task title="Make a code">
          <Step>Go to <Ui>Discounts</Ui> and choose <Ui>Create code</Ui>.</Step>
          <Step>Type the code customers will enter, then pick what it gives: a percent off items, a percent or dollar amount off the order, or free shipping.</Step>
          <Step>Set any limits: start and end dates, total uses, <Ui>Once per customer</Ui>, <Ui>Minimum order</Ui>, or which compounds it covers.</Step>
          <Step>Read the summary on the right. It says in plain English what the code does and shows the most it could take off a large order.</Step>
          <Step>Choose <Ui>Create code</Ui> to make it live, or <Ui>Save paused</Ui> to switch it on later.</Step>
        </Task>
        <Task title="Make a batch of one-time codes" note="for a group, like VIP thank-yous">
          <Step>Choose <Ui>Generate batch</Ui>. Enter a prefix such as <span className="a-code">VIP-OCT-</span> and how many codes you need.</Step>
          <Step>Set the discount and dates the same way as a single code, then choose <Ui>Generate codes</Ui>.</Step>
          <Step>On the batch page, choose <Ui>Download CSV</Ui> and hand out one code per person. Each works once.</Step>
        </Task>
        <Task title="Pause, resume or end a code">
          <Step>Open the code. <Ui>Pause</Ui> stops it working until you choose <Ui>Resume</Ui>. <Ui>End now</Ui> stops it for good and can&apos;t be undone.</Step>
          <Step>A batch has <Ui>Pause all</Ui> and <Ui>Resume all</Ui>.</Step>
        </Task>
        <Task title="Give back a use after a refund">
          <Step>Open the code. A use on a refunded order shows <Ui>Reset use</Ui>.</Step>
          <Step>Choose it and that use stops counting toward the code&apos;s limits, so the customer (or someone else) can use it again.</Step>
        </Task>
      </>}
      how={<>
        <Rules items={[
          ["One per item", <>Each item gets <b>one</b> discount: the largest of its pack price, the automatic percent (new account {NEW_ACCOUNT_PCT}% or partner {CODE_DISCOUNT_PCT}%) or an item code. They never add together.</>],
          ["Order codes", <>A code that takes money off the whole order replaces the item discounts when that&apos;s cheaper, or applies after them if it was set to go <b>on top</b>.</>],
          ["Store-wide maximum", <>No order gets more than <b>{capPct}%</b> off its list price, whatever combines. Checkout says &quot;capped at {capPct}%&quot; when it trims. Change it in <Ui>Settings</Ui>.</>],
          ["One code box", <>A customer can enter one code per order. Free shipping can be part of the same code.</>],
          ["\u201CHeld\u201D", <>A code is reserved while its checkout is open. If the customer pays, it&apos;s used. If they don&apos;t, it frees up when that checkout is cancelled: when they start a new one, or when the payment page expires.</>],
          ["Lock to one email", <>A single code can be locked so it only works for one account&apos;s email. Batch codes can&apos;t: anyone holding one can use it once.</>],
        ]} />
        <Example title={`A VIP uses ${EXAMPLE_CODE} (${EXAMPLE_CODE_PCT}% off items)`}>
          <table>
            <thead><tr><th>Item</th><th>List</th><th>Without code</th><th>With code</th></tr></thead>
            <tbody>
              {ex.lines.map((l) => (
                <tr key={l.name}><td>{l.name}<small>{l.note}</small></td><td>{usd(l.listCents)}</td><td>{usd(l.withoutCents)}</td><td className="win">{usd(l.withCents)}</td></tr>
              ))}
              <tr className="tot"><td>Goods</td><td>{usd(ex.listCents)}</td><td>{usd(ex.withoutCents)}</td><td>{usd(ex.goodsCents)}</td></tr>
            </tbody>
          </table>
          <P>
            The 10-pack gets {EXAMPLE_CODE_PCT}% <b>instead of</b> its 20% pack price, not {EXAMPLE_CODE_PCT + 20}%.{" "}
            {ex.capped
              ? <>That would be {EXAMPLE_CODE_PCT}% off list, over the {capPct}% maximum, so checkout trims it and shows &quot;capped at {capPct}%&quot;.</>
              : <>The total discount is {ex.offPct}% of list, under the {capPct}% maximum.</>}
            {ex.freeShipping ? ` The order is still over $${FREE_SHIPPING_THRESHOLD_USD}, so shipping is free.` : ""}
          </P>
        </Example>
      </>}
      watch={[
        <>Don&apos;t promise a customer more than {capPct}% off. The checkout will trim it.</>,
        <>Batch codes aren&apos;t tied to a person. If one must only work for one customer, make a single code and turn on <Ui>Lock to one email</Ui>.</>,
        <>A code that&apos;s been used can&apos;t be deleted, only ended.</>,
      ]}
    />
  );
}
