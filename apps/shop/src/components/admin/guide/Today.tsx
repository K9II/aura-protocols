import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { ALERTS_KEEP_DAYS, RATE_TODO_SHARE, SHIP_LATE_BUSINESS_DAYS, TODO_LINES_MAX } from "@/lib/today/constants";
import { BOUNCE_LIMIT_PCT, COMPLAINT_LIMIT_PCT, RUN_STALE_HOURS } from "@/lib/email/constants";

export default function Today() {
  return (
    <Chapter
      id="today"
      lede="The command center's front page: what needs you right now on the left, and how the shop is selling on the right. It's the first thing you see when you open the admin."
      tasks={<>
        <Task title="Clear an alert">
          <Step>Alerts are problems the store couldn&apos;t fix by itself; each one was also emailed to you. Fix the problem where the alert says (Orders, Catalog, Stripe…).</Step>
          <Step>Choose <Ui>Done</Ui>, add a <Ui>Note</Ui> if it will help later, then <Ui>Mark done</Ui>.</Step>
          <Step><Ui>Past alerts</Ui> lists the last {ALERTS_KEEP_DAYS} days, with your notes and who marked each one done.</Step>
        </Task>
        <Task title="Work through the to-do list">
          <Step>Sections run most urgent first: <Ui>Alerts</Ui>, <Ui>Disputes</Ui>, <Ui>Orders to ship</Ui>, <Ui>Stock</Ui>, <Ui>Lots</Ui>, <Ui>Email</Ui>, <Ui>Partners</Ui>, <Ui>Inquiries</Ui>. A section shows only when something needs doing, up to {TODO_LINES_MAX} lines; <Ui>and N more</Ui> opens the full list.</Step>
          <Step>Each line has a button to where the job is done: <Ui>Respond</Ui>, <Ui>Pick list</Ui>, <Ui>Open lot</Ui>, <Ui>Announce</Ui>, <Ui>Review</Ui>. When nothing is left, the list says <Ui>All clear</Ui>.</Step>
          <Step>Messages from the contact and wholesale forms that need a reply show under <Ui>Inquiries</Ui>, the longest-waiting first; red once the customer has waited a business day. <Ui>Reply</Ui> opens the conversation.</Step>
        </Task>
        <Task title="Read the numbers">
          <Step>Pick the period at the top of <Ui>Numbers</Ui>: today, the last week or the last month. Each figure is compared with the same stretch just before; today is compared with yesterday up to the same time.</Step>
          <Step>The bars show sales by hour (today) or by day; the red bar is now. <Ui>Top strengths</Ui> ranks what sold the most in the period.</Step>
        </Task>
        <Task title="When a section can't load">
          <Step>It says <Ui>Couldn&apos;t load</Ui> in place; everything else on the page is current. Choose <Ui>Reload</Ui>. If it keeps happening, the server log has the reason.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Sales", <>Goods after discounts: what customers paid for the products after pack, partner, new-account and code discounts. It&apos;s the same figure Email and Discounts use and the one partners earn on. Paid and shipped orders count, on the day they were paid.</>],
          ["Charged, shipping, tax", <>The line under Sales, for checking against Stripe. <Ui>charged</Ui> is what cards and banks paid (store credit isn&apos;t in it); <Ui>shipping</Ui> includes shipping insurance.</>],
          ["Refunds", <>A refunded order drops out of Sales. The <Ui>refunded</Ui> line shows refunds made in the period, at the order total.</>],
          ["Shop time", <>Days and hours are Mountain time, like discount dates and email schedules.</>],
          ["Orders to ship", <>Paid orders, oldest first. One turns red when it has waited more than {SHIP_LATE_BUSINESS_DAYS} business days (weekends don&apos;t count).</>],
          ["Email", <>Shows when the hourly email run hasn&apos;t run for {RUN_STALE_HOURS} hours or had failures, when bounces reach {BOUNCE_LIMIT_PCT * RATE_TODO_SHARE}% (half of Amazon&apos;s {BOUNCE_LIMIT_PCT}% limit) or complaints reach {COMPLAINT_LIMIT_PCT * RATE_TODO_SHARE}% (half of {COMPLAINT_LIMIT_PCT}%), and while a campaign is sending.</>],
          ["Alert repeats", <>The same problem again adds to its open alert instead of making a new one: <Ui>×3</Ui> means it happened three times. The newest detail is on top. Every time is still emailed.</>],
          ["Menu number", <>The number beside <Ui>Today</Ui> counts everything on the to-do list: open alerts, chargebacks and early fraud warnings, orders to ship, stock, lots, email, partners and inquiries that need a reply.</>],
        ]} />
      }
      watch={[
        <>Sales won&apos;t match Stripe payouts: Stripe also collects shipping and tax, takes its fees and pays out days later. Check against the <Ui>charged</Ui> line instead.</>,
        <>An alert marked <Ui>Done</Ui> comes back if the problem happens again. Fix the cause, not just the alert.</>,
        <>A section that says <Ui>Couldn&apos;t load</Ui> isn&apos;t empty, it&apos;s unknown. Reload before deciding nothing needs doing.</>,
      ]}
    />
  );
}
