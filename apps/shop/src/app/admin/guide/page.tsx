import type { Metadata } from "next";
import { requireOwner } from "@/lib/dal";
import { getDiscountCap } from "@/lib/discounts/data";
import GuideNav from "@/components/admin/guide/GuideNav";
import StartHere from "@/components/admin/guide/StartHere";
import Discounts from "@/components/admin/guide/Discounts";
import Orders from "@/components/admin/guide/Orders";
import Customers from "@/components/admin/guide/Customers";
import Catalog from "@/components/admin/guide/Catalog";
import Partners from "@/components/admin/guide/Partners";
import Payouts from "@/components/admin/guide/Payouts";

export const metadata: Metadata = { title: "Guide", robots: { index: false, follow: false } };

// The owner's manual for the command center (spec 2026-10-04-admin-guide-design.md).
// Every module ships with its chapter (components/admin/guide/chapters.ts).
export default async function AdminGuidePage() {
  await requireOwner();
  const capPct = await getDiscountCap();
  return (
    <div className="a-guide">
      <GuideNav />
      <article>
        <div className="a-ph" style={{ marginBottom: 10 }}><div><h1>Guide</h1></div></div>
        <p className="a-g-intro">How the command center works, written for anyone running the store. Each page in the menu has a chapter here, and its <span className="a-ui">How this works</span> link opens it.</p>
        <StartHere />
        <Discounts capPct={capPct} />
        <Orders />
        <Customers />
        <Catalog />
        <Partners />
        <Payouts />
      </article>
    </div>
  );
}
