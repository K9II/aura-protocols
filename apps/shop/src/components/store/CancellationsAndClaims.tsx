// "Cancellations & claims" notes under the buy box (was "Before ordering" until 2026-10-19, when the
// "check the certificate first" point went — the whole page does that). Wording follows the
// refund and shipping policies (cancel until shipped, then final; wrong items always put right,
// transit damage only with shipping protection; 48-hour photo claims). Keep it in sync with
// /refund-policy and /shipping.
import { PROTECTION_PDP_NOTE } from "@/lib/shipping-protection";

export default function CancellationsAndClaims() {
  return (
    <div className="s-before">
      <h3 className="s-micro">Cancellations &amp; claims</h3>
      <ul>
        <li>You can cancel for a full refund until your order ships. Once it ships, the sale is final.</li>
        <li>{PROTECTION_PDP_NOTE}</li>
      </ul>
    </div>
  );
}
