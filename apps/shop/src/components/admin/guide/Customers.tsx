import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { NEW_ACCOUNT_PCT, OFFER_DAYS_TEXT } from "@/lib/account/offer";
import { HOLIDAY_WINDOW_TEXT } from "@/lib/holiday/season";
import { CREDIT_CATEGORIES, CATEGORY_LABEL, MAX_CREDIT_CENTS } from "@/lib/customers/rules";

const reasons = CREDIT_CATEGORIES.map((c) => CATEGORY_LABEL[c]).join(", ");

export default function Customers() {
  return (
    <Chapter
      id="customers"
      lede="Every account: their orders, what they agreed to at sign-up, and their store credit. This is where you give credit, resend a verification email, or block someone."
      tasks={<>
        <Task title="Find a customer">
          <Step>Go to <Ui>Customers</Ui> and type a name, email, organization or order number (like AP-1026) in the search box.</Step>
          <Step>Use the tabs to narrow it: <Ui>Ordered</Ui>, <Ui>No order yet</Ui>, <Ui>Unverified</Ui> or <Ui>Blocked</Ui>. Click a name to open the customer.</Step>
        </Task>
        <Task title="Give store credit" note="goodwill, or product for a reviewer">
          <Step>Open the customer and choose <Ui>Adjust credit</Ui>.</Step>
          <Step>Leave <Ui>Add credit</Ui> selected, type the amount and pick a reason ({reasons}). Add a note for yourself.</Step>
          <Step>Keep <Ui>Email the customer</Ui> ticked to tell them, with an optional message. Check the new balance, then choose <Ui>Add</Ui>.</Step>
          <Step>To send product to a reviewer, give credit with the reason <Ui>Seeding</Ui>; they check out with it like any order.</Step>
        </Task>
        <Task title="Take credit back">
          <Step>Choose <Ui>Adjust credit</Ui>, then <Ui>Remove credit</Ui>, the amount and a reason. Removing never emails the customer.</Step>
        </Task>
        <Task title="Resend a verification email">
          <Step>An unverified customer shows <Ui>Resend verification</Ui> at the top of their page. You can send one a minute.</Step>
        </Task>
        <Task title="Block an account">
          <Step>Open the customer and choose <Ui>Block</Ui>. The box lists exactly what will happen, including any checkout it will cancel.</Step>
          <Step>Write the reason (only you see it) and choose <Ui>Block account</Ui>. To undo it, use <Ui>Unblock</Ui> in the red banner.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Statuses", <><Ui>Verified</Ui> confirmed their email. <Ui>Unverified</Ui> hasn&apos;t yet and can&apos;t order until they do. <Ui>Blocked</Ui> is locked out. <Ui>Partner</Ui> also has a partner account.</>],
          ["Spent", <>Money actually paid on paid or shipped orders. Store credit they used isn&apos;t counted, and cancelled checkouts don&apos;t count.</>],
          ["Store credit", <>Each change needs a reason and is logged with your name. The balance can never go below zero, and no single change can be over ${MAX_CREDIT_CENTS / 100}. Customers tick <Ui>Apply store credit</Ui> at checkout to use it.</>],
          ["Blocking", <>They&apos;re signed out on every device and can&apos;t sign back in; the site tells them the account is closed and to email support. Their open checkouts are cancelled and any held code or credit is released. Orders, agreements and credit are kept.</>],
          ["Agreement record", <>When they agreed to the terms, which version, and that they confirmed 21 or older, research use only and the dispute policy, with the device used. Use it as evidence if a customer disputes a charge.</>],
          ["Google accounts", <>Customers can also use <Ui>Continue with Google</Ui>. Google has already confirmed their email, so they show as <Ui>Verified</Ui> straight away. The first time, they finish their account on a short page with the same agreement box, recorded the same way. If their Google address matches an existing account, Google simply signs them in to it. If someone had made a password account with that email but never confirmed it, signing in with Google confirms it and removes the old password — they can set a new one with <Ui>Forgot password?</Ui> on the sign-in page.</>],
          ["New-account offer", <>{NEW_ACCOUNT_PCT}% off a first order placed within {OFFER_DAYS_TEXT}, applied automatically. Visitors see it on a dark offer panel on the sign-in page and beside the Google finish page; from {HOLIDAY_WINDOW_TEXT} (shop time, every year) the panel adds a tree, snow and a garland. The overview shows whether the offer was used, is still open, or expired.</>],
        ]} />
      }
      watch={[
        <>Blocking cancels any checkout they have open. Check their orders first; don&apos;t block on a hunch.</>,
        <>A blocked email can&apos;t be used to make a new account (with Google either), so unblock rather than asking them to sign up again.</>,
        <>Someone who chose <Ui>Continue with Google</Ui> but didn&apos;t finish the account isn&apos;t a customer yet: they aren&apos;t listed here and can&apos;t browse or order until they finish.</>,
        <>Credit you add is real money off a future order. Use <Ui>Seeding</Ui> for reviewer product so it&apos;s easy to total later.</>,
      ]}
    />
  );
}
