import type { Metadata } from "next";
import InquiryForm from "@/components/store/InquiryForm";

export const metadata: Metadata = {
  title: "Affiliates",
  description: "Apply to the Aura Protocols partner program.",
  alternates: { canonical: "/affiliates" },
};

export default function AffiliatesPage() {
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16 max-w-3xl">
        <p className="s-micro s-eyebrow">Partner program</p>
        <h1 className="s-h1 mb-5">
          Become an <em>affiliate.</em>
        </h1>
        <p className="text-[color:var(--ink-soft)] max-w-[56ch] mb-4">
          We partner with publishers and educators who cover research compounds responsibly. Partners
          agree to our research-use-only content rules: no human-use claims, no instructions for use.
        </p>
        <p className="text-[color:var(--ink-soft)] max-w-[56ch] mb-10">
          Tell us where you publish and roughly how many people you reach.
        </p>
        <InquiryForm kind="affiliate" orgLabel="Website / channel" messageLabel="Where you publish and your audience" />
      </div>
    </div>
  );
}
