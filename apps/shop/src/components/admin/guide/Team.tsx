import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { PERMISSION_LABEL } from "@/lib/staff/permissions";
import { NEVER_FOR_ASSISTANT } from "@/lib/staff/roles";

export default function Team() {
  return (
    <Chapter
      id="team"
      lede="Who can sign in to the command center. You are the Owner; Claude has its own Assistant login, so everything it does shows under its name."
      tasks={<>
        <Task title="See what the Assistant did">
          <Step>Open <Ui>Activity</Ui>, choose <Ui>Person</Ui> → <b>Assistant (Claude)</b> — or open <Ui>Team</Ui> and use its <Ui>Last 7 days</Ui> link.</Step>
        </Task>
        <Task title="Finish one of its drafts">
          <Step>Open <Ui>Inquiries</Ui> and look for rows marked <Ui>Draft ready</Ui>; open one, edit if you like, then <Ui>Send</Ui> — or <Ui>Discard draft</Ui> to clear it. Campaign drafts are in <Ui>Email</Ui>; dispute drafts are in <Ui>Disputes</Ui> → <Ui>Submit evidence</Ui>.</Step>
        </Task>
        <Task title="Stop the Assistant">
          <Step><Ui>Sign out everywhere</Ui> ends its sessions — it can sign in again with its password. <Ui>Disable</Ui> keeps it out until you <Ui>Enable</Ui> it.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Roles", <>Owner sees and does everything. Assistant sees everything except partner bank details and W-9s, plus it can save drafts and mark alerts done.</>],
          ["Never for the Assistant", <>{[...NEVER_FOR_ASSISTANT].map((p) => PERMISSION_LABEL[p]).join(", ")}.</>],
          ["Widening it", <>Only through a code change you approve in a pull request.</>],
          ["Disable", <>Takes effect on its next click. Its drafts and history stay.</>],
        ]} />
      }
      watch={[
        <>The database key in the shop&apos;s settings (on this PC and on Vercel) can go around any login. Claude uses it only for database changes you OK in chat.</>,
        <>Disabling a login doesn&apos;t delete the account or its history.</>,
        <>Opening a new inquiry moves it to <Ui>Needs reply</Ui>, whoever opens it.</>,
      ]}
    />
  );
}
