import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import {
  ATTRIBUTION_DAYS, BOUNCE_LIMIT_PCT, BOUNCE_WARN_PCT, CART_RECOVERY_HOURS, COMPLAINT_LIMIT_PCT, COMPLAINT_WARN_PCT,
  MAX_SEND_ATTEMPTS, RUN_STALE_HOURS, STATS_DAYS,
} from "@/lib/email/constants";
import { WELCOME_DAYS, CART_HOURS } from "@/lib/email/schedule";

export default function Email() {
  return (
    <Chapter
      id="email"
      lede="Everything the store emails to subscribers: the welcome series and cart reminders that send themselves, and the campaigns you write — new lots, promotions and research news. This is where you send, pause and see what happened."
      tasks={<>
        <Task title="Announce a new lot" note="the most common send">
          <Step>When a lot goes live with its certificate, <Ui>Email</Ui> shows <Ui>Lots waiting to announce</Ui>. Choose <Ui>Announce</Ui>.</Step>
          <Step>A New lots draft opens with the lots ticked and the copy filled in. Change anything you like, then <Ui>Save draft</Ui>.</Step>
          <Step>Choose <Ui>Send test to me</Ui> and check it on your phone. Then <Ui>Send now…</Ui> (the box shows exactly how many people) or <Ui>Schedule…</Ui>.</Step>
        </Task>
        <Task title="Send a promotion">
          <Step>First make the code in <Ui>Discounts</Ui>. Then <Ui>New campaign</Ui> → <Ui>Promotion</Ui> and pick the code.</Step>
          <Step>Write the subject, headline and body. The email shows the code and its terms for you. Read the <Ui>Checks</Ui> before sending: a code that hasn&apos;t started, or has fewer uses left than people on the list, is flagged.</Step>
        </Task>
        <Task title="Write research news">
          <Step><Ui>New campaign</Ui> → <Ui>Research news</Ui>. Add a button to a page on the site if you want one (like /coa).</Step>
        </Task>
        <Task title="Stop a campaign that's going out">
          <Step>Open it and choose <Ui>Stop sending…</Ui>. People not reached yet won&apos;t get it. A stopped campaign can&apos;t be restarted; use <Ui>Copy as new draft</Ui> to send it again later.</Step>
        </Task>
        <Task title="Pause the welcome series or cart reminders" note="a typo or broken link">
          <Step>In <Ui>Automations</Ui>, flip the switch and confirm. Add a note so you remember why.</Step>
          <Step>Turn it back on when it&apos;s fixed. Nothing goes out in a burst.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Who gets campaigns", <>Confirmed subscribers only: people who verified their email and haven&apos;t unsubscribed. Blocked accounts never get email. <Ui>Has ordered</Ui> means at least one paid order; <Ui>Never ordered</Ui> is everyone else. The list is fixed the moment sending starts, and nobody gets the same campaign twice.</>],
          ["Sending", <>Send now starts right away. A long list keeps going on the next hourly email run until everyone is reached. A send that fails is tried again on the next runs, up to {MAX_SEND_ATTEMPTS} tries. Only one campaign sends at a time; a scheduled one waits its turn.</>],
          ["Checks", <>Every save runs the same banned-phrase scan as the website. A banned phrase blocks sending; you can still send yourself a test. Lots must still be live and on the store; a code must not be paused, ended or used up.</>],
          ["Automations", <>The welcome series sends {WELCOME_DAYS.length} files over {WELCOME_DAYS[WELCOME_DAYS.length - 1]} days after someone confirms. Cart reminders go {CART_HOURS.join(", ")} hours after a checkout is left open. Paused cart reminders that come due are skipped, not sent late; the welcome series picks up one file at a time.</>],
          ["Orders after email", <>A paid order counts if the customer was sent that email in the {ATTRIBUTION_DAYS} days before paying; the most recent email gets the credit. Revenue is goods after discounts, the same number partners earn on. A cart is <Ui>recovered</Ui> if the reminded order was paid, or the customer paid a new order within {CART_RECOVERY_HOURS} hours of a reminder. These are orders after the email, not proof it caused them.</>],
          ["Health", <>Amazon reviews accounts with bounces over {BOUNCE_LIMIT_PCT}% or complaints over {COMPLAINT_LIMIT_PCT}%. The tiles turn amber at {BOUNCE_WARN_PCT}% / {COMPLAINT_WARN_PCT}% and red at the limit. Numbers on the overview cover the last {STATS_DAYS} days.</>],
          ["Hourly run", <>The line under the tiles shows the last hourly email run. It turns red if there hasn&apos;t been one for {RUN_STALE_HOURS} hours, or a run had failures; <Ui>Run history</Ui> shows the details.</>],
        ]} />
      }
      watch={[
        <>Amber or red bounce or complaint figures need attention before the next campaign: a bad list or a misleading subject can get the account paused by Amazon.</>,
        <>Make the discount code in <Ui>Discounts</Ui> before writing a promotion, and give it enough uses for the whole list.</>,
        <>A red hourly-run line means welcome files, cart reminders and scheduled campaigns aren&apos;t going out. Check the cron job in Vercel.</>,
        <>Only drafts can be edited. To change a scheduled campaign, choose <Ui>Unschedule</Ui> first.</>,
        <>A campaign stuck <Ui>Sending</Ui> after an error keeps retrying on every hourly run and blocks every other campaign from sending. Open it and press <Ui>Stop sending…</Ui> to free the queue.</>,
        <>Pausing or ending a promotion&apos;s code in <Ui>Discounts</Ui> while its campaign is sending does not stop the emails — people reached later get a code that no longer works. Stop the campaign first, then change the code.</>,
        <><Ui>Stop sending…</Ui> takes effect within a few seconds, not instantly — a few more emails can go out after you press it.</>,
      ]}
    />
  );
}
