import { Chapter, Rules, Step, Task, Ui } from "@/components/admin/guide/parts";
import { CHECKOUT_EXPIRY_HOURS, PURITY_FLOOR_PCT } from "@/lib/constants";
import { COA_MAX_BYTES, COUNT_REASONS, COUNT_REASON_LABEL, DEFAULT_LOW_AT, PURITY_MIN } from "@/lib/catalog-ops/rules";

const reasons = COUNT_REASONS.map((r) => COUNT_REASON_LABEL[r]).join(", ");

export default function Catalog() {
  return (
    <Chapter
      id="catalog"
      lede="Prices, stock and certified lots for every product and strength. A lot only sells once its certificate is attached and its receiving check is done; the store always sells the oldest live lot first."
      tasks={<>
        <Task title="Receive a shipment" note="one lot of one strength">
          <Step>Open the product in <Ui>Catalog &amp; lots</Ui> and choose <Ui>Receive a lot</Ui> on the strength that arrived.</Step>
          <Step>Type the lot number, purity, method and test date from the certificate, and attach the certificate PDF (up to {COA_MAX_BYTES / 1024 / 1024} MB).</Step>
          <Step>Fill the receiving check: <Ui>Ordered</Ui> from the supplier invoice, <Ui>Counted</Ui> from the box, and any <Ui>Damaged</Ui>. If they don&apos;t match, say what happened — you&apos;ll also get an email.</Step>
          <Step>Choose <Ui>Save and put live</Ui> to start selling it, or <Ui>Save as draft</Ui> to finish later.</Step>
        </Task>
        <Task title="Put a draft lot live">
          <Step>Drafts show under the live lots with <Ui>Put live</Ui>. It&apos;s greyed out until the certificate is attached (the receiving check is already done — a lot can&apos;t be saved without it). Use <Ui>Edit</Ui> to fix anything first — once live, the lot&apos;s details can&apos;t change.</Step>
        </Task>
        <Task title="Change a price">
          <Step>On the product, click the pencil next to <Ui>Price / vial</Ui>, type the new price and choose Save. Checkouts already open keep the price they were shown.</Step>
        </Task>
        <Task title="Hide or show a product">
          <Step>Use the <Ui>Shown on store</Ui> switch at the top of the product. Hidden products disappear from the store and search; checkouts already open still complete.</Step>
        </Task>
        <Task title="Add a new strength after a market review">
          <Step>On the product, choose <Ui>Add a strength</Ui>, type the amount and pick its unit (mg, mcg or IU), a price per vial, a low-stock level and, if you have one yet, the 3PL SKU.</Step>
          <Step>It starts hidden. Receive its first lot, put the lot live, then choose <Ui>Show on store</Ui> on the strength.</Step>
          <Step>This adds a strength to a product that already exists. A brand-new product still needs a code change — its name, class and description are compliance-scanned text, not something the command center can write.</Step>
        </Task>
        <Task title="Drop a strength" note="archive it">
          <Step>Open the <Ui>⋯</Ui> menu on the strength and choose <Ui>Archive strength</Ui>. It comes off the store and out of the main list; its lots, certificates and orders are kept, and the certificates stay findable in COA lookup.</Step>
          <Step>Changed your mind? Find it under <Ui>Archived strengths</Ui> on the product, or the <Ui>Archived</Ui> tab on the list, and choose <Ui>Restore</Ui> — it comes back hidden.</Step>
          <Step><Ui>Delete strength</Ui> only works on one with no lots and no orders (added by mistake); otherwise it&apos;s disabled and tells you to archive instead.</Step>
        </Task>
        <Task title="Fix a count" note="damage, a recount, a vial found, an owner withdrawal">
          <Step>On a live lot, choose <Ui>Correct count</Ui>, pick <Ui>Remove vials</Ui> or <Ui>Add vials</Ui>, the number and a reason ({reasons}).</Step>
          <Step><Ui>Owner withdrawal</Ui> is remove-only and always needs a note — vials you take out of stock yourself. Write down truthfully what they were for; this list is the owner&apos;s-draw record for the bookkeeper, valued at cost from the supplier invoice until purchase orders exist.</Step>
          <Step>You can&apos;t remove vials that are already held for a checkout or sold.</Step>
        </Task>
        <Task title="Retire a lot or replace its certificate">
          <Step>Open the <Ui>⋯</Ui> menu on a live lot. <Ui>Retire lot</Ui> stops it selling now (held vials still ship); <Ui>Replace certificate</Ui> swaps the PDF and keeps the old one in the log.</Step>
        </Task>
      </>}
      how={
        <Rules items={[
          ["Stock", <>Each lot has its own count. <Ui>Left</Ui> = sellable − held − sold, where sellable is counted minus damaged plus any corrections. Customers only ever see <Ui>In stock</Ui>, <Ui>Low stock</Ui> or <Ui>Out of stock</Ui>, never the number.</>],
          ["Low stock", <>A strength shows Low at or under its <Ui>Low at</Ui> level ({DEFAULT_LOW_AT} vials unless you set it when adding the strength, or change it after).</>],
          ["Oldest first", <>Orders take vials from the oldest live lot, then the next. One order line can take some from each; the order shows exactly which.</>],
          ["Held vials", <>Vials are held the moment a customer opens checkout, so two people can never buy the last vial. Paying sells them; a cancelled checkout puts them back at once, and an abandoned one when its payment page expires after {CHECKOUT_EXPIRY_HOURS} hours (or sooner if the same customer starts a new checkout).</>],
          ["Strengths", <>Product content (name, class, description) stays code — a new product needs a code change. Strengths are different: <Ui>Add a strength</Ui>, <Ui>Hide from store</Ui> / <Ui>Show on store</Ui>, <Ui>Archive strength</Ui> and <Ui>Delete strength</Ui> all happen right here, with no code change, so you can act on a market review the same day.</>],
          ["Hidden vs. archived", <>Hidden stays in the main list, greyed out — pause a strength without losing track of it. Archived leaves the main list entirely (its own section and tab) — for one you don&apos;t expect to sell again soon. Both keep every lot, certificate and order; both come back with <Ui>Show on store</Ui> or <Ui>Restore</Ui>.</>],
          ["Certificates", <>Every lot that was ever live stays findable in COA lookup, so a customer with an older vial can still check it — including lots of a hidden or archived strength, as long as the product itself is shown.</>],
          ["Purity", <>The dialog warns below {PURITY_FLOOR_PCT}% (the figure the site promises) and refuses anything under {PURITY_MIN}%.</>],
          ["3PL SKU", <>The code your warehouse uses for each strength — the same for every lot. It prints on the pick list.</>],
        ]} />
      }
      watch={[
        <>A live lot&apos;s number, purity, method and test date are fixed — customers have seen them. Check the draft before putting it live.</>,
        <>Retiring a strength&apos;s last live lot shows that strength Out of stock straight away. Archiving the last strength on the store takes the whole product off the store until you add or restore one.</>,
        <>If a strength sells out while it&apos;s in someone&apos;s cart, checkout removes it and tells them. Receive the next lot before the current one runs out.</>,
        <>Delete is only for a strength added by mistake — one with no lots and no orders. Everything else is Archive, which keeps the record.</>,
        <>You&apos;ll get an email if an order is ever paid without enough held vials (oversold) — check the counts that day.</>,
      ]}
    />
  );
}
