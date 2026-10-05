// Placeholder — the full results view (progress, stop, figures, activity,
// copy) ships in Task 16. This keeps the [id] page typed and routable.
import type { CampaignRow } from "@/lib/email/campaigns/data";

export default async function CampaignResults({ c }: { c: CampaignRow }) {
  return <div className="a-page">{c.name}</div>;
}
