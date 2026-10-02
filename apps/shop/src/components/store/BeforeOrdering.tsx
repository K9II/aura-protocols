// "Before ordering" notes under the buy box. Wording follows the refund and
// shipping policies (cancel until shipped, then final; 48-hour photo claims,
// one replacement). Keep it in sync with /refund-policy and /shipping.
export default function BeforeOrdering() {
  return (
    <div className="s-before">
      <h3 className="s-micro">Before ordering</h3>
      <ul>
        <li>Check the certificate for this lot first: lot number, purity and test method are listed above, and the full certificate is on the COA lookup.</li>
        <li>You can cancel for a full refund until your order ships. Once it ships, the sale is final.</li>
        <li>Damaged or wrong item? Photograph the outer packaging, inner packaging and vial labels, and email support within 48 hours of delivery. Approved claims get one replacement.</li>
      </ul>
    </div>
  );
}
