import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import {
  ATTACHMENT_MAX_BYTES, ATTACHMENTS_PER_EMAIL, INQUIRY_AUTO_CLOSE_DAYS, INQUIRY_LATE_BUSINESS_DAYS, INQUIRY_RATE_LIMITS, RAW_MAIL_KEEP_DAYS,
} from "@/lib/inquiries/constants";
import { SUPPORT_EMAIL } from "@/lib/constants";

const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
const mb = (b: number) => `${Math.round(b / (1024 * 1024))} MB`;
const hourly = INQUIRY_RATE_LIMITS[0].max;

export default function Inquiries() {
  return (
    <Chapter
      id="inquiries"
      lede={<>Every message sent through the contact and wholesale forms, and every email reply to them, in one place. You answer here; the reply is emailed from {SUPPORT_EMAIL} and the customer&apos;s answer comes back into the same conversation.</>}
      tasks={<>
        <Task title="Answer an inquiry">
          <Step>Open <Ui>Inquiries</Ui>. The <Ui>Open</Ui> tab lists what needs a reply, the longest-waiting first. Open one.</Step>
          <Step>Read the conversation. Photos and PDFs the customer sent show under their message; <Ui>Show full email</Ui> shows the whole email they wrote, quoted history included.</Step>
          <Step>Write your reply, or choose <Ui>Insert saved reply</Ui> and edit it. Then <Ui>Send</Ui>, or <Ui>Send and close</Ui> when nothing more is needed.</Step>
        </Task>
        <Task title="When a reply is refused">
          <Step>Every reply is checked for the same banned words as the website. A hit stops the email and names the word. Change the wording — or use the saved reply <Ui>Research use only</Ui> for questions about use.</Step>
        </Task>
        <Task title="Connect a message to a customer">
          <Step>A message from someone with an account shows their card: orders, store credit, verified or blocked. If they wrote from another address, enter their account email under <Ui>Link account</Ui>.</Step>
        </Task>
        <Task title="Unmatched email">
          <Step>The <Ui>Unmatched</Ui> tab holds replies that couldn&apos;t be matched to a conversation (an old reply address, or a reference from another address). Choose <Ui>Attach to inquiry…</Ui> with its Q-number, or <Ui>Dismiss</Ui>.</Step>
        </Task>
        <Task title="Saved replies">
          <Step>Choose <Ui>Saved replies</Ui> to add, edit or delete them. They pass the same check when you save.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Statuses", <><Ui>New</Ui> until someone opens it, then <Ui>Needs reply</Ui>. Your reply makes it <Ui>Waiting on customer</Ui>; their answer puts it back to <Ui>Needs reply</Ui>. <Ui>Close</Ui> when it&apos;s done — a later reply from the customer opens it again.</>],
          ["Auto-close", <>A conversation waiting on the customer closes by itself after {days(INQUIRY_AUTO_CLOSE_DAYS)} without an answer. Nothing is sent to them.</>],
          ["Late", <>An open conversation turns red once the customer has waited {days(INQUIRY_LATE_BUSINESS_DAYS)} (Monday to Friday, shop time). Today lists the longest-waiting ones.</>],
          ["How replies come back", <>Each conversation has its own reply address, so the customer just replies to the email. What they quoted from earlier emails is cut off; the full email stays one click away.</>],
          ["Attachments", <>Photos (JPEG, PNG, HEIC) and PDFs are kept, up to {ATTACHMENTS_PER_EMAIL} per email and {mb(ATTACHMENT_MAX_BYTES)} each; anything else is listed as not kept. Your replies go out without attachments — link to a certificate on the COA page instead. The original emails are kept for {days(RAW_MAIL_KEEP_DAYS)}.</>],
          ["Contact form", <>Anyone can use it, signed in or not, so people locked out of their account can still reach you. To limit spam, one address can send {hourly} messages an hour.</>],
          ["Who did what", <>Each conversation&apos;s <Ui>History</Ui> shows who opened, replied, closed or changed it; every owner action also appears in <Ui>Activity</Ui>.</>],
        ]} />
      }
      watch={[
        <>Don&apos;t answer questions about use, amounts or preparation — the check will stop many, not all. The <Ui>Research use only</Ui> saved reply is there for them.</>,
        <>Messages sent straight to {SUPPORT_EMAIL} (not through the site) stay in Outlook; only the site&apos;s forms and replies to them come here.</>,
        <>A <Ui>Sent from a different address</Ui> warning means the reply came from another email than the one on the inquiry — check who it is before sharing order details.</>,
        <>A <Ui>Bounced</Ui> reply never arrived. The conversation goes back to <Ui>Needs reply</Ui>; check the address with the customer another way.</>,
      ]}
    />
  );
}
