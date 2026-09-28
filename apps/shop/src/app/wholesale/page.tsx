import type { Metadata } from "next";
import InquiryForm from "@/components/store/InquiryForm";

export const metadata: Metadata = {
  title: "Wholesale",
  description: "Volume pricing and lot reservation for laboratories and research organizations.",
  alternates: { canonical: "/wholesale" },
};

export default function WholesalePage() {
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16 max-w-3xl">
        <p className="s-micro s-eyebrow">Wholesale</p>
        <h1 className="s-h1 mb-5">
          For <em>laboratories.</em>
        </h1>
        <p className="text-[color:var(--ink-soft)] max-w-[56ch] mb-10">
          Volume pricing, lot reservation, and certificates for every lot you receive. Tell us which
          compounds and roughly what quantity you need, and we&apos;ll reply with pricing and lead times.
        </p>
        <InquiryForm kind="wholesale" orgLabel="Organization / institution" messageLabel="Compounds and quantities" />
      </div>
    </div>
  );
}
