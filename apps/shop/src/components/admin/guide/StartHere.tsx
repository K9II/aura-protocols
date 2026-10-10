import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";

export default function StartHere() {
  return (
    <Chapter
      id="start"
      lede="The command center is where the store is run: orders to ship, discount codes, partners and their payouts. Only the owner account can open it today."
      tasks={
        <Task title="Find your way around">
          <Step>The menu on the left groups pages by job: <Ui>Sell</Ui>, <Ui>Stock</Ui>, <Ui>Reach</Ui> and <Ui>Partners</Ui>. Greyed items marked <Ui>Soon</Ui> aren&apos;t built yet.</Step>
          <Step>A number beside <Ui>Today</Ui> counts everything on its to-do list. Beside <Ui>Orders</Ui>, it&apos;s how many paid orders are waiting to ship; beside <Ui>Disputes</Ui>, chargebacks waiting for your response and open early fraud warnings; beside <Ui>Partners</Ui>, how many applications are waiting.</Step>
          <Step>Every page has a <Ui>How this works</Ui> link in the top bar that opens its chapter here. On a phone it&apos;s the <Ui>?</Ui> button.</Step>
          <Step><Ui>View store</Ui> opens the shop in a new tab, as customers see it. It&apos;s only in the computer layout; on a phone, open the store in another tab.</Step>
        </Task>
      }
      how={
        <Rules items={[
          ["Test mode", <>A yellow <Ui>Test mode</Ui> tag means payments run through Stripe&apos;s sandbox: nothing is charged and no real money moves. The tag disappears once the store takes live payments.</>],
          ["When something fails", <>An action that can&apos;t be saved stops and shows &quot;That didn&apos;t go through&quot; with a <Ui>Try again</Ui> button and a short reference code. Nothing is half-saved. Try again; if it keeps failing, send the reference code to whoever maintains the store.</>],
          ["Alert emails", <>Problems the store can&apos;t fix by itself, such as a refund it couldn&apos;t match, a payout run that stopped or a chargeback, are emailed to the owner&apos;s alert address. Each email says what happened and what to do. Each one also shows under <Ui>Alerts</Ui> on <Ui>Today</Ui> until you mark it done.</>],
          ["Settings", <>Discount settings are under <Ui>Discounts</Ui> → <Ui>Settings</Ui>. Payment methods are set in the Stripe dashboard, not here.</>],
        ]} />
      }
      watch={[
        <>Everything here acts on the live store unless the <Ui>Test mode</Ui> tag is showing.</>,
        <>Don&apos;t share the owner login. Staff accounts with their own permissions are planned before the first hire.</>,
      ]}
    />
  );
}
