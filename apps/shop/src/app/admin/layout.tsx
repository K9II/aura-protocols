import type { Metadata } from "next";
import { stripeLive } from "@/lib/stripe-dashboard";
import { Instrument_Sans } from "next/font/google";
import "./admin.css";
import AdminShell, { type Views } from "@/components/admin/AdminShell";
import { requireStaff } from "@/lib/dal";
import { can, ROLE_LABEL } from "@/lib/staff/roles";
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
  const staff = await requireStaff();
  const views: Views = {
    today: can(staff, "today.view"), orders: can(staff, "orders.view"), wholesale: can(staff, "wholesale.view"), customers: can(staff, "customers.view"),
    discounts: can(staff, "discounts.view"), disputes: can(staff, "disputes.view"), catalog: can(staff, "catalog.view"),
    email: can(staff, "email.view"), inquiries: can(staff, "inquiries.view"), partners: can(staff, "partners.view"),
    payouts: can(staff, "payouts.view"), activity: can(staff, "activity.view"),
  };
  const canTeam = can(staff, "staff.manage");
  // todayNavCount, disputesNavCount and inquiriesNavCount never throw (0 and a log line on failure).
  // Only run each nav count when its module is visible to this role.
  const [orders, partners, email, today, disputes, inquiries] = await Promise.all([
    views.orders ? countOrderTabs().catch((err) => { console.error("orders nav count failed:", err); return null; }) : Promise.resolve(null),
    views.partners ? countPartners() : Promise.resolve(null),
    views.email ? emailNavCount() : Promise.resolve(0),
    views.today ? todayNavCount() : Promise.resolve(0),
    views.disputes ? disputesNavCount() : Promise.resolve(0),
    views.inquiries ? inquiriesNavCount() : Promise.resolve(0),
  ]);
  const testMode = !stripeLive();
  const who = { name: staff.isAssistant ? staff.fullName : staff.fullName.split(" ")[0] || "Owner", role: ROLE_LABEL[staff.role], assistant: staff.isAssistant };
  return (
    <div className={instrument.variable}>
      <AdminShell counts={{ orders: orders?.to_ship ?? 0, partners: partners?.applied ?? 0, email: email ?? 0, today: today ?? 0, disputes: disputes ?? 0, inquiries: inquiries ?? 0 }} testMode={testMode} who={who} views={views} canTeam={canTeam}>
        {children}
      </AdminShell>
    </div>
  );
}
