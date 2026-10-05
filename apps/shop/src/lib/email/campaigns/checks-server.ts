import "server-only";
import { codeForCampaign, lotChoices, type CampaignRow } from "@/lib/email/campaigns/data";
import { audienceCounts } from "@/lib/email/stats";
import { campaignChecks, type Check } from "@/lib/email/campaigns/checks";

// The checks for a stored campaign at a given send time — authoritative.
// Shared by the cron (re-checks a scheduled campaign before starting it),
// the admin actions and the campaign page.
export async function checksFor(c: CampaignRow, sendAtMs: number): Promise<Check[]> {
  const [choices, code, counts] = await Promise.all([
    c.kind === "new_lots" ? lotChoices(c.id) : Promise.resolve([]),
    c.kind === "promotion" ? codeForCampaign(c.discount_code_id) : Promise.resolve(null),
    audienceCounts(),
  ]);
  const waiting = new Set(choices.map((l) => l.lot));
  return campaignChecks({
    kind: c.kind,
    fields: { subject: c.subject, previewText: c.preview_text, ...c.content },
    lots: c.lots_snapshot.map((l) => ({ lot: l.lot, waiting: waiting.has(l.lot) })),
    code: code?.facts ?? null,
    recipients: counts[c.audience],
  }, sendAtMs);
}
