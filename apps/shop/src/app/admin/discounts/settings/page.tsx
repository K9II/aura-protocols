import type { Metadata } from "next";
import { requireOwner } from "@/lib/dal";
import { discountDashboard, getDiscountCap } from "@/lib/discounts/data";
import { usd } from "@/lib/html";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";
import { NEW_ACCOUNT_PCT } from "@/lib/account/offer";
import CapForm from "@/components/admin/discounts/CapForm";
import { Crumbs, Icon } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Discount settings", robots: { index: false, follow: false } };

export default async function DiscountSettingsPage() {
  await requireOwner();
  const [cap, dash] = await Promise.all([getDiscountCap(), discountDashboard()]);
  const steps = [
    ["Item discounts", `Per item, the larger of pack, partner, new-account ${NEW_ACCOUNT_PCT}% or an item-% code`],
    ["Order code", "Replaces step 1 if better, or applies after it when set to apply on top"],
    [`${cap}% cap`, "Trims the total discount on goods"],
    ["Shipping", `Free over $${FREE_SHIPPING_THRESHOLD_USD} or with a free-shipping code`],
    ["Tax", "Stripe Tax on what's charged"],
    ["Store credit", "Pays down the total last"],
  ] as const;
  return (
    <div className="a-page narrow">
      <Crumbs items={[{ label: "Discounts", href: "/admin/discounts" }, { label: "Settings" }]} />
      <div className="a-ph"><div><h1>Discount settings</h1><p>Apply to every order, whatever codes, packs or partner links are involved.</p></div></div>

      <section className="a-fsec">
        <div className="a-fsec-h"><h3>Store-wide cap</h3><span>The most any order&apos;s goods can be discounted</span></div>
        <div className="a-fsec-b a-cap-grid">
          <CapForm cap={cap} />
          <div>
            <div className="a-callout info"><Icon name="info" /><div>Counts pack prices, new-account, partner and code discounts together. Free shipping and store credit don&apos;t count — store credit is a payment, not a discount.</div></div>
            <table className="a-bk" style={{ marginTop: 12 }}>
              <thead><tr><th>At {cap}% · last 30 days</th><th>Orders</th><th>Trimmed</th></tr></thead>
              <tbody><tr><td>Orders over the cap<small>showed &quot;capped at {cap}%&quot;</small></td><td>{dash.capped_30d}</td><td>{usd(dash.trimmed_30d)}</td></tr></tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="a-fsec">
        <div className="a-fsec-h"><h3>Order of operations</h3><span>Fixed — shown so every price is explainable</span></div>
        <div className="a-fsec-b"><div className="a-steps">{steps.map(([b, s], i) => (
          <div key={b} className={`a-step${i === 2 ? " hl" : ""}`}><span className="n">{String(i + 1).padStart(2, "0")}</span><b>{b}</b><small>{s}</small></div>
        ))}</div></div>
      </section>

      <section className="a-fsec">
        <div className="a-fsec-h"><h3>Redemption rules</h3><span>Built in</span></div>
        <div className="a-fsec-b"><div className="a-rules">
          <div className="k">Who can use a code</div><div>Signed-in accounts with a confirmed email</div>
          <div className="k">Codes per order</div><div>One — partner codes and discount codes share the box and the names</div>
          <div className="k">Wrong-code attempts</div><div>10 per 10 minutes per account and network, then a short wait</div>
          <div className="k">A use is counted</div><div>Held when checkout starts · used on payment · released if checkout is cancelled or expires</div>
          <div className="k">Refunds</div><div>The use stays counted; reset it from the code&apos;s page</div>
        </div></div>
      </section>
    </div>
  );
}
