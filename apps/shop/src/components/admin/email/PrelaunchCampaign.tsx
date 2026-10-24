"use client";
// A pre-launch email before it's sent (2026-10-23): the fixed email, a test to the owner,
// then Send now… to its waitlist audience. No editor — the wording lives in lib/email/prelaunch.ts.
// Early access (#3) first needs the opening date. Previews show a sample invite and early link.
import { useActionState } from "react";
import { sendTestAction, setOpeningDateAction } from "@/app/admin/email/actions";
import { AUDIENCE_LABEL, PRELAUNCH, type Audience, type PrelaunchKind } from "@/lib/email/campaigns/rules";
import type { CampaignRow } from "@/lib/email/campaigns/data";
import { inviteLabel, inviteUrl } from "@/lib/waitlist/codes";
import { SAMPLE_INVITE_CODE } from "@/lib/email/campaigns/sample";
import { Icon } from "@/components/admin/ui";
import EmailPreview from "@/components/admin/email/EmailPreview";
import SendDialog from "@/components/admin/email/SendDialog";

// earlyPriceCents: GLOW's live price for #3's checkout card; null when it couldn't be read.
type Props = {
  c: CampaignRow & { kind: PrelaunchKind }; counts: Record<Audience, number>; site: string; mailingAddress: string; lastTest: string | null;
  canSend: boolean; canDraft?: boolean; earlyPriceCents?: number | null;
};

function OpeningDate({ c }: { c: Props["c"] }) {
  const [state, action, pending] = useActionState(setOpeningDateAction, null);
  return (
    <form action={action} className="a-fld" style={{ marginBottom: 14, maxWidth: 420 }}>
      <input type="hidden" name="id" value={c.id} />
      <label htmlFor="pre-opening">Opening date</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input id="pre-opening" name="openingOn" type="date" className="a-input" defaultValue={c.content.openingOn ?? ""} required />
        <button type="submit" className="a-btn" disabled={pending}>{pending ? "Saving…" : "Save date"}</button>
      </div>
      <small className="muted">The day the store opens to everyone. The email names it.</small>
      {state?.fieldErrors?.openingOn && <div className="a-err" role="alert">{state.fieldErrors.openingOn}</div>}
      {state?.ok && <div className="a-callout ok" role="status" style={{ marginTop: 8 }}><Icon name="check" /><span>{state.ok}</span></div>}
    </form>
  );
}

export default function PrelaunchCampaign({ c, counts, site, mailingAddress, lastTest, canSend, canDraft = canSend, earlyPriceCents = null }: Props) {
  const [testState, test, testing] = useActionState(sendTestAction, null);
  const p = PRELAUNCH[c.kind];
  const recipients = counts[c.audience];
  const isEarly = c.kind === "early_access";
  const openingOn = c.content.openingOn ?? null;
  const priceMissing = isEarly && earlyPriceCents === null;
  const ready = !isEarly || (openingOn !== null && !priceMissing);
  const n = recipients.toLocaleString("en-US");
  return (
    <>
      <div className="a-callout info" style={{ marginBottom: 14 }}><Icon name="info" />
        <span>Pre-launch email {p.step}. The wording is fixed (approved 2026-10-23) and it goes once, to {AUDIENCE_LABEL[c.audience]}: {n} people now. {p.when}</span></div>
      {isEarly && canDraft && <OpeningDate c={c} />}
      {priceMissing && <div className="a-err" role="alert" style={{ marginBottom: 14 }}>GLOW 70 mg has no live price, so the email can&apos;t be previewed or sent. Check it in Catalog.</div>}
      {canSend && (
        <div className="a-actbar" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <form action={test}>
            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="updatedAt" value={c.updated_at} />
            <button type="submit" className="a-btn" disabled={testing || !ready}><Icon name="mail" />{testing ? "Sending test…" : "Send test to me"}</button>
          </form>
          <SendDialog id={c.id} from="draft" updatedAt={c.updated_at} name={c.name} subject={c.subject} audienceLabel={AUDIENCE_LABEL[c.audience]}
            recipients={recipients} lastTest={lastTest} disabled={recipients === 0 || !ready}
            warning={isEarly ? `Checkout must take payments before you send this: the link lets ${n} people order a day early. Sending turns early access on.` : undefined} />
        </div>
      )}
      {testState?.ok && <div className="a-callout ok" role="status" style={{ marginBottom: 14 }}><Icon name="check" /><span>{testState.ok}</span></div>}
      {testState?.error && <div className="a-err" role="alert" style={{ marginBottom: 14 }}>{testState.error}</div>}
      {isEarly && !openingOn ? (
        <div className="a-callout warn"><Icon name="warn" /><span>Type the opening date to see the email.</span></div>
      ) : !priceMissing && (
        <EmailPreview input={{
          kind: c.kind, subject: c.subject, previewText: c.preview_text, content: c.content, lots: [], code: null,
          invite: { url: inviteUrl(site, SAMPLE_INVITE_CODE), label: inviteLabel(site, SAMPLE_INVITE_CODE) },
          early: isEarly && openingOn && earlyPriceCents !== null ? { openingOn, priceCents: earlyPriceCents, url: `${site}/early` } : null,
        }} site={site} mailingAddress={mailingAddress} />
      )}
    </>
  );
}
