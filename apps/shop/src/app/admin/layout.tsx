import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./admin.css";
import AdminShell from "@/components/admin/AdminShell";
import { requireStaff } from "@/lib/dal";
import { countOrderTabs } from "@/lib/orders";
import { countPartners } from "@/lib/partners/data";
import { emailNavCount } from "@/lib/email/campaigns/data";
import { todayNavCount } from "@/lib/today/today";
import { disputesNavCount } from "@/lib/disputes/data";
import { inquiriesNavCount } from "@/lib/inquiries/data";

// Admin UI sans (approved mocks 2026-10-04); Newsreader + JetBrains Mono come from the root layout.
const instrument = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-instrument" });

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireStaff();
  // todayNavCount, disputesNavCount and inquiriesNavCount never throw (0 and a log line on failure).
  const [orders, partners, email, today, disputes, inquiries] = await Promise.all([
    countOrderTabs().catch((err) => { console.error("orders nav count failed:", err); return null; }),
    countPartners(), emailNavCount(), todayNavCount(), disputesNavCount(), inquiriesNavCount(),
  ]);
  const testMode = !(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live");
  return (
    <div className={instrument.variable}>
      <AdminShell counts={{ orders: orders?.to_ship ?? 0, partners: partners.applied, email, today, disputes, inquiries }} testMode={testMode} ownerName={owner.fullName.split(" ")[0] || "Owner"}>
        {children}
      </AdminShell>
    </div>
  );
}
