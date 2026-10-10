import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "@/components/store/PolicyPage";

export const metadata: Metadata = { title: "Research Use Only", alternates: { canonical: "/ruo" } };

// Requires legal review before launch.
export default function RuoPage() {
  return (
    <PolicyPage
      policy="ruo"
      title={<>Research <em>use only.</em></>}
      updated="October 2, 2026"
      summary={{
        headline: <>Every compound we sell is for in-vitro laboratory research only &mdash; never for use in humans or animals.</>,
      }}
      sections={[
        { id: "meaning", heading: "What research use only means", body: (
          <p>Every compound sold by Aura Protocols is intended solely for in-vitro laboratory research. None is a drug, dietary supplement, cosmetic, or food; none is approved by the FDA; and each is not intended to diagnose, treat, cure, or prevent any disease.</p>
        ) },
        { id: "what-we-dont-do", heading: "What we don't do", body: (
          <p>We don&apos;t provide instructions for use, preparation guidance, or any claim about effects in humans or animals, and we don&apos;t answer questions seeking them. Our affiliate and wholesale partners agree to the same rules.</p>
        ) },
        { id: "who-can-buy", heading: "Who can buy", body: (
          <p>Buyers must be 21 or older, confirm research use when they create an account and again with each order, and make the buyer representations in our <Link href="/terms#eligibility" className="p-link">Terms of Service</Link>. We refuse or cancel orders when there is reason to believe a product is intended for any other purpose.</p>
        ) },
        { id: "responsibility", heading: "Your responsibility", body: (
          <p>Buyers are responsible for handling, storing, and disposing of every product in accordance with all applicable laws and their institution&apos;s policies.</p>
        ) },
      ]}
    />
  );
}
