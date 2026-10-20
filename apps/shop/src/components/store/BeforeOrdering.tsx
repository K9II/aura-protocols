// "Before ordering" notes under the buy box. Wording follows the refund and
// shipping policies (cancel until shipped, then final; wrong items always put right,
// transit damage only with shipping protection; 48-hour photo claims). Keep it in sync with /refund-policy and /shipping.
import { PROTECTION_PDP_NOTE } from "@/lib/shipping-protection";

export default function BeforeOrdering() {
  return (
    <div className="s-before">
      <h3 className="s-micro">Before ordering</h3>
      <ul>
        <li>Check the certificate for this lot first: lot number, purity and test method are listed on this page, and the full certificate is on the COA lookup.</li>
        <li>You can cancel for a full refund until your order ships. Once it ships, the sale is final.</li>
        <li>{PROTECTION_PDP_NOTE}</li>
      </ul>
    </div>
  );
}
