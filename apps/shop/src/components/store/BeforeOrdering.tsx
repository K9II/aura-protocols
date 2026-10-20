import Link from "next/link";

// "Before ordering" notes under the buy box. Wording follows the refund and
// shipping policies (cancel until shipped, then final; 48-hour photo claims,
// one replacement). Keep it in sync with /refund-policy and /shipping.
// where="side" (desktop, 2026-10-19): a panel in the left column under the Lot record, styled
// to pair with it, so the two columns end level; the buy box keeps a one-line summary
// (BeforeOrderingLine) so the key terms still sit next to Add to cart. Phones keep the list
// under the buy box.
export default function BeforeOrdering({ where = "buy" }: { where?: "buy" | "side" }) {
  return (
    <div className={`s-before s-before--${where}`}>
      {where === "side"
        ? <div className="s-rec-head"><h3 className="s-rec-h">Before <em>ordering</em></h3></div>
        : <h3 className="s-micro">Before ordering</h3>}
      <ul>
        <li>Check the certificate for this lot first: lot number, purity and test method are listed on this page, and the full certificate is on the COA lookup.</li>
        <li>You can cancel for a full refund until your order ships. Once it ships, the sale is final.</li>
        <li>Damaged or wrong item? Photograph the outer packaging, inner packaging and vial labels, and email support within 48 hours of delivery. Approved claims get one replacement.</li>
      </ul>
    </div>
  );
}

// Desktop: the key terms in one line under the buy box; the full notes are in the left column.
export function BeforeOrderingLine() {
  return (
    <p className="s-before-line">
      Cancel for a full refund until your order ships · final once shipped · <Link href="/refund-policy">Refund policy →</Link>
    </p>
  );
}
