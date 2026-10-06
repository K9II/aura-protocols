import Link from "next/link";

// The one sign-up agreement sentence on the storefront forms (/sign-in and
// /finish-account). The gate (GateSteps) carries the same words in its own markup.
export default function AgreementText() {
  return (
    <span>I am 21 or older, I am buying for in-vitro laboratory research use only (not for human or animal use), and I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms</Link> and the <Link href="/refund-policy" target="_blank" rel="noopener noreferrer">Refund &amp; Dispute Policy</Link>.</span>
  );
}
