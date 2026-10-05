import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./admin.css";
import AdminShell from "@/components/admin/AdminShell";
import { requireOwner } from "@/lib/dal";
import { countOrdersForOwner } from "@/lib/orders";
import { countPartners } from "@/lib/partners/data";

// Admin UI sans (approved mocks 2026-10-04); Newsreader + JetBrains Mono come from the root layout.
const instrument = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-instrument" });

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner();
  const [orders, partners] = await Promise.all([countOrdersForOwner(), countPartners()]);
  const testMode = !(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live");
  return (
    <div className={instrument.variable}>
      <AdminShell counts={{ orders: orders.paid, partners: partners.applied }} testMode={testMode} ownerName={owner.fullName.split(" ")[0] || "Owner"}>
        {children}
      </AdminShell>
    </div>
  );
}
