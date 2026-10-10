import type { Metadata } from "next";
import { requirePermission } from "@/lib/dal";
import { can } from "@/lib/staff/roles";
import { lotChoices } from "@/lib/email/campaigns/data";
import { audienceCounts } from "@/lib/email/stats";
import { parseKind } from "@/lib/email/campaigns/rules";
import { promotionCodes } from "@/app/admin/email/campaigns/codes";
import { siteUrl } from "@/lib/supabase/env";
import { Crumbs } from "@/components/admin/ui";
import CampaignEditor from "@/components/admin/email/CampaignEditor";

export const metadata: Metadata = { title: "New campaign", robots: { index: false, follow: false } };

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const staff = await requirePermission("email.draft");
  const kind = parseKind((await searchParams).kind);
  const [lots, counts, codes] = await Promise.all([kind === "new_lots" ? lotChoices(null) : Promise.resolve([]), audienceCounts(), promotionCodes()]);
  return (
    <div className="a-page" style={{ maxWidth: 1200 }}>
      <Crumbs items={[{ label: "Email", href: "/admin/email" }, { label: "New campaign" }]} />
      <div className="a-ph"><div><h1>New campaign <span className="a-chip draft">Draft</span></h1><p>Nothing is sent until you press Send now or Schedule.</p></div></div>
      <CampaignEditor campaign={null} kind={kind} lotChoices={lots} codes={codes.options} codeRender={codes.render} audienceCounts={counts} checks={[]} site={siteUrl()} mailingAddress={process.env.MAILING_ADDRESS ?? "[mailing address]"} canSend={can(staff, "email.send")} />
    </div>
  );
}
