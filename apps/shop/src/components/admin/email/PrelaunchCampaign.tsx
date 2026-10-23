"use client";
// A pre-launch email before it's sent (2026-10-23): the fixed email, a test to the owner,
// then Send now… to its waitlist audience. No editor — the wording lives in lib/email/prelaunch.ts.
import { useActionState } from "react";
import { sendTestAction } from "@/app/admin/email/actions";
import { AUDIENCE_LABEL, PRELAUNCH, type Audience, type PrelaunchKind } from "@/lib/email/campaigns/rules";
import type { CampaignRow } from "@/lib/email/campaigns/data";
import { Icon } from "@/components/admin/ui";
import EmailPreview from "@/components/admin/email/EmailPreview";
import SendDialog from "@/components/admin/email/SendDialog";

type Props = { c: CampaignRow & { kind: PrelaunchKind }; counts: Record<Audience, number>; site: string; mailingAddress: string; lastTest: string | null; canSend: boolean };

export default function PrelaunchCampaign({ c, counts, site, mailingAddress, lastTest, canSend }: Props) {
  const [testState, test, testing] = useActionState(sendTestAction, null);
  const p = PRELAUNCH[c.kind];
  const recipients = counts[c.audience];
  return (
    <>
      <div className="a-callout info" style={{ marginBottom: 14 }}><Icon name="info" />
        <span>Pre-launch email {p.step}. The wording is fixed (approved 2026-10-23) and it goes once, to {AUDIENCE_LABEL[c.audience]}: {recipients.toLocaleString("en-US")} people now. {p.when}</span></div>
      {canSend && (
        <div className="a-actbar" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <form action={test}>
            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="updatedAt" value={c.updated_at} />
            <button type="submit" className="a-btn" disabled={testing}><Icon name="mail" />{testing ? "Sending test…" : "Send test to me"}</button>
          </form>
          <SendDialog id={c.id} from="draft" updatedAt={c.updated_at} name={c.name} subject={c.subject} audienceLabel={AUDIENCE_LABEL[c.audience]}
            recipients={recipients} lastTest={lastTest} disabled={recipients === 0} />
        </div>
      )}
      {testState?.ok && <div className="a-callout ok" role="status" style={{ marginBottom: 14 }}><Icon name="check" /><span>{testState.ok}</span></div>}
      {testState?.error && <div className="a-err" role="alert" style={{ marginBottom: 14 }}>{testState.error}</div>}
      <EmailPreview input={{ kind: c.kind, subject: c.subject, previewText: c.preview_text, content: c.content, lots: [], code: null }} site={site} mailingAddress={mailingAddress} />
    </>
  );
}
