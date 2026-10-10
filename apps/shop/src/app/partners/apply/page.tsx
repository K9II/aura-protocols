import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ApplyForm from "@/components/partners/ApplyForm";
import { requireCustomer } from "@/lib/dal";
import { getPartnerForCustomer } from "@/lib/partners/data";
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";

export const metadata: Metadata = { title: "Apply to partner", robots: { index: false, follow: false } };

export default async function ApplyPage() {
  const customer = await requireCustomer("/partners/apply");
  if (await getPartnerForCustomer(customer.id)) redirect("/partners");
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-14">
        <div className="s-ap-hero">
          <p className="s-micro s-eyebrow">Partner application · signed in as {customer.email}</p>
          <h1 className="s-h1 mb-4" style={{ fontSize: 48 }}>Apply to <em>partner.</em></h1>
          <p className="s-ap-lede">Three short sections. We read every application and reply by email, usually within two business days.</p>
        </div>
        <ApplyForm codePct={CODE_DISCOUNT_PCT} />
      </div>
    </div>
  );
}
