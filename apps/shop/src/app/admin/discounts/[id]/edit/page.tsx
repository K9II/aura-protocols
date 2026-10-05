import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { getCodeById, getDiscountCap } from "@/lib/discounts/data";
import DiscountForm from "@/components/admin/discounts/DiscountForm";
import { Crumbs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Edit code", robots: { index: false, follow: false } };

export default async function EditCodePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [code, capPct] = await Promise.all([getCodeById(id), getDiscountCap()]);
  if (!code) notFound();
  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Discounts", href: "/admin/discounts" }, { label: code.batch_id ? "Batch" : code.code, href: code.batch_id ? `/admin/discounts/batch/${code.batch_id}` : `/admin/discounts/${code.id}` }, { label: "Edit" }]} />
      <div className="a-ph"><div><h1>Edit {code.batch_id ? "batch rule" : code.code}</h1>{code.batch_id && <p>Changes apply to every code in the batch.</p>}</div></div>
      <DiscountForm mode={code.batch_id ? "batch" : "single"} capPct={capPct} existing={code} />
    </div>
  );
}
