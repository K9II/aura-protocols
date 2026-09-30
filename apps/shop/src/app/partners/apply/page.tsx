import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ApplyForm from "@/components/partners/ApplyForm";
import { requireCustomer } from "@/lib/dal";
import { getPartnerForCustomer } from "@/lib/partners/data";

export const metadata: Metadata = { title: "Apply to partner", robots: { index: false, follow: false } };

export default async function ApplyPage() {
  const customer = await requireCustomer("/partners/apply");
  if (await getPartnerForCustomer(customer.id)) redirect("/partners");
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-14">
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Partner application · signed in as {customer.email}</p>
        <h1 className="s-h1 mb-8" style={{ fontSize: 48 }}>Apply to <em>partner.</em></h1>
        <ApplyForm />
      </div>
    </div>
  );
}
