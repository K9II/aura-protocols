import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { REFERRAL_CREDIT_DOLLARS } from "@/lib/waitlist/codes";
import { WAITLIST_HOURLY_CAP } from "@/lib/waitlist/data";
import { TOP_REFERRERS, WAITLIST_PAGE_SIZE, WAITLIST_WEEK_DAYS } from "@/lib/waitlist/admin";

export default function Waitlist() {
  return (
    <Chapter
      id="waitlist"
      lede="Everyone who joined the waitlist on the coming-soon page, who invited them, and how many colleagues each person brought in. It's read-only: people join and leave from the site and their emails."
      tasks={<>
        <Task title="See how the list is growing">
          <Step>Go to <Ui>Waitlist</Ui>. The tiles show <Ui>On the waitlist</Ui>, <Ui>Joined today</Ui>, <Ui>Joined · {WAITLIST_WEEK_DAYS} days</Ui>, <Ui>Came through an invite</Ui> and <Ui>Unsubscribed</Ui>.</Step>
          <Step>Today shows the same count under <Ui>Numbers</Ui>; click it to open this page.</Step>
        </Task>
        <Task title="Find someone">
          <Step>Type part of an email, or a six-letter invite code, in the search box. A code finds the person it belongs to; an email also finds everyone that person invited.</Step>
        </Task>
        <Task title="Find people for the partner program">
          <Step><Ui>Top referrers</Ui> lists the {TOP_REFERRERS} people who brought in the most colleagues. Invite the strongest ones to apply at /partners/apply.</Step>
        </Task>
        <Task title="Download the list">
          <Step>Choose <Ui>Download CSV</Ui>. It has every row, newest first: email, joined time, status, invite code and link, who they came through, and their colleague count.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Joining", <>Entering an email on the coming-soon page puts it straight on the list (no confirm step), shows the person their invite link, and emails them the same link. You get a <Ui>Waitlist sign-up</Ui> email for each new person.</>],
          ["Invite links", <>Each person gets a code like M55DFQ and a link auraprotocols.com/?r=CODE. Whoever joins through it shows that person under <Ui>Came through</Ui>. Only the first link someone used counts, and a person can&apos;t invite themselves.</>],
          ["Statuses", <><Ui>On the list</Ui> joined. <Ui>Not confirmed</Ui> signed up before the confirm step was removed and never clicked the link. <Ui>Unsubscribed</Ui> used the unsubscribe link and gets no more waitlist email; they still count in the joined tiles.</>],
          ["Referral credit", <>The plan is ${REFERRAL_CREDIT_DOLLARS} store credit for each colleague who places a first order. It isn&apos;t paid yet — that part is built before the store opens. This page only counts who invited whom.</>],
          ["Paging", <>{WAITLIST_PAGE_SIZE} people per page, newest first. Times are shop time (Mountain).</>],
        ]} />
      }
      watch={[
        <>If more than {WAITLIST_HOURLY_CAP} invite emails go out in an hour, the form asks people to try again shortly and you get an alert. That usually means a bot, not a rush.</>,
        <>A colleague count is sign-ups, not orders. Don&apos;t promise anyone credit from this page.</>,
        <>The CSV holds people&apos;s emails. Keep it private and don&apos;t upload it to other mailing tools: they agreed to hear from Aura, not anyone else.</>,
      ]}
    />
  );
}
