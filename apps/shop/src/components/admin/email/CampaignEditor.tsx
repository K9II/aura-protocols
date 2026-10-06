"use client";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { saveCampaignAction, sendTestAction } from "@/app/admin/email/actions";
import { AUDIENCES, AUDIENCE_LABEL, CAMPAIGN_KINDS, KIND_HELP, KIND_LABEL, LIMITS, type Audience, type CampaignKind } from "@/lib/email/campaigns/rules";
import type { Check } from "@/lib/email/campaigns/checks";
import type { RenderCode } from "@/lib/email/campaigns/render";
import type { CampaignRow } from "@/lib/email/campaigns/data";
import type { AlertLot } from "@/lib/emails-marketing";
import { Icon } from "@/components/admin/ui";
import EmailPreview from "@/components/admin/email/EmailPreview";
import SendDialog from "@/components/admin/email/SendDialog";
import ScheduleDialog from "@/components/admin/email/ScheduleDialog";

type Props = {
  campaign: CampaignRow | null; kind: CampaignKind; lotChoices: AlertLot[]; codes: Array<{ id: string; label: string }>;
  codeRender: Record<string, RenderCode>; audienceCounts: Record<Audience, number>; checks: Check[];
  site: string; mailingAddress: string; lastTest?: string | null; defaultScheduleLocal?: string;
};

export default function CampaignEditor(p: Props) {
  const c = p.campaign;
  const kind = c?.kind ?? p.kind;
  const [f, setF] = useState({
    name: c?.name ?? "", subject: c?.subject ?? "", previewText: c?.preview_text ?? "",
    headline: c?.content.headline ?? "", body: c?.content.body ?? "", buttonLabel: c?.content.buttonLabel ?? "", buttonPath: c?.content.buttonPath ?? "",
    audience: (c?.audience ?? "all") as Audience, discountCodeId: c?.discount_code_id ?? "",
  });
  const [lots, setLots] = useState<string[]>(c?.lots_snapshot.map((l) => l.lot) ?? []);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [saveState, save, saving] = useActionState(saveCampaignAction, null);
  const [testState, test, testing] = useActionState(sendTestAction, null);
  // A successful save (an existing draft update) returns `ok` — without this,
  // Send now / Schedule / Send test stay disabled until the page reloads.
  // Adjusted during render (React's "store info from previous renders"
  // pattern), not an effect, so it takes effect in the same commit the new
  // saveState arrives in — see https://react.dev/learn/you-might-not-need-an-effect.
  const [prevSaveState, setPrevSaveState] = useState(saveState);
  if (saveState !== prevSaveState) {
    setPrevSaveState(saveState);
    if (saveState?.ok) setDirty(false);
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setDirty(true); };
  const checks = saveState?.checks ?? p.checks;
  const fe = saveState?.fieldErrors ?? {};
  const savedClean = !!c && !dirty && !saveState?.fieldErrors;
  // (not importing isBlocked: checks.ts pulls the compliance scanner, which mustn't ship to the browser)
  const blocked = checks.some((x) => x.level === "block");
  const canSend = savedClean && !blocked;
  const allLots = useMemo(() => {
    const m = new Map(p.lotChoices.map((l) => [l.lot, l]));
    for (const l of c?.lots_snapshot ?? []) if (!m.has(l.lot)) m.set(l.lot, l);
    return [...m.values()];
  }, [p.lotChoices, c]);
  const preview = {
    kind, subject: f.subject, previewText: f.previewText,
    content: { headline: f.headline, body: f.body, buttonLabel: f.buttonLabel, buttonPath: f.buttonPath },
    lots: allLots.filter((l) => lots.includes(l.lot)), code: f.discountCodeId ? p.codeRender[f.discountCodeId] ?? null : null,
  };
  const status = !c ? "Save to run the checks" : dirty ? "Unsaved changes" : blocked ? `Fix ${checks.filter((x) => x.level === "block").length} problem${checks.filter((x) => x.level === "block").length === 1 ? "" : "s"} to send` : "All changes saved";
  const err = (k: string) => fe[k] && <div className="a-err" role="alert">{fe[k]}</div>;
  const hit = (k: string) => checks.find((x) => x.level === "block" && x.field === k);

  return (
    <div className="a-ed">
      <div className="a-pseg a-only-phone" role="tablist" aria-label="Edit or preview">
        <button type="button" role="tab" aria-selected={tab === "edit"} className={tab === "edit" ? "on" : undefined} onClick={() => setTab("edit")}>Edit</button>
        <button type="button" role="tab" aria-selected={tab === "preview"} className={tab === "preview" ? "on" : undefined} onClick={() => setTab("preview")}>Preview</button>
      </div>
      <div className={tab === "preview" ? "a-hide-phone" : undefined}>
      <form action={save} id="campaign-form">
        {c ? <input type="hidden" name="id" value={c.id} /> : <input type="hidden" name="kind" value={kind} />}
        <div className="a-fsec"><div className="a-fsec-h"><h3>Type</h3>{c && <span>fixed after the first save</span>}</div>
          <div className="a-fsec-b"><div className="a-typeseg">{CAMPAIGN_KINDS.map((k) => {
            const inner = <><b>{KIND_LABEL[k]}</b><small>{KIND_HELP[k]}</small></>;
            if (k === kind) return <div key={k} className="on" aria-current="true">{inner}</div>;
            return c ? <div key={k} className="lock">{inner}</div> : <Link key={k} href={`/admin/email/campaigns/new?kind=${k}`}>{inner}</Link>;
          })}</div></div></div>

        {kind === "new_lots" && (
          <div className="a-fsec"><div className="a-fsec-h"><h3>Lots</h3><span>certified, live and not announced yet</span></div>
            <div className="a-fsec-b">
              {allLots.length === 0 ? <div className="muted">No lots are waiting to announce.</div> : <div className="a-lotpick">{allLots.map((l) => (
                <label key={l.lot} className="lr">
                  <input type="checkbox" name="lots" value={l.lot} checked={lots.includes(l.lot)} onChange={(e) => { setLots(e.target.checked ? [...lots, l.lot] : lots.filter((x) => x !== l.lot)); setDirty(true); }} />
                  <span><b>{l.compoundName}</b> · {l.strengths} <small>· {l.purityPct.toFixed(1)}% HPLC{l.method === "HPLC+MS" ? " · MS confirmed" : ""}</small></span>
                  <span className="mono">{l.lot}</span><small>tested {l.testedOn}</small>
                </label>
              ))}</div>}
              {err("lots")}
              <div className="help">The lot table, certificate links and product links are added to the email for you.</div>
            </div></div>
        )}

        {kind === "promotion" && (
          <div className="a-fsec"><div className="a-fsec-h"><h3>Code</h3><span>made in Discounts; the campaign never changes it</span></div>
            <div className="a-fsec-b"><div className="a-fld">
              <label htmlFor="discountCodeId" className="sr-only">Code</label>
              <select id="discountCodeId" name="discountCodeId" className="a-input" value={f.discountCodeId} onChange={set("discountCodeId")}>
                <option value="">Pick a code…</option>
                {p.codes.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
              {err("discountCodeId")}
              <div className="help">The email shows the code and its terms: what it takes off, the end date, and any minimum order.</div>
            </div></div></div>
        )}

        <div className="a-fsec"><div className="a-fsec-h"><h3>Message</h3></div>
          <div className="a-fsec-b">
            <div className="a-fld"><label htmlFor="name">Name <span className="muted" style={{ fontWeight: 400 }}>· only you see it</span></label><input id="name" name="name" className="a-input" maxLength={LIMITS.name} value={f.name} onChange={set("name")} />{err("name")}</div>
            <div className="a-row">
              <div className="a-fld"><label htmlFor="subject">Subject</label><input id="subject" name="subject" className="a-input" maxLength={LIMITS.subject} value={f.subject} onChange={set("subject")} />{err("subject")}{hit("subject") && <div className="a-err">{hit("subject")!.text}</div>}</div>
              <div className="a-fld"><label htmlFor="previewText">Preview text</label><input id="previewText" name="previewText" className="a-input" maxLength={LIMITS.previewText} value={f.previewText} onChange={set("previewText")} /><div className="help">The grey line after the subject in most inboxes.</div>{err("previewText")}</div>
            </div>
            <div className="a-fld"><label htmlFor="headline">Headline</label><input id="headline" name="headline" className="a-input" maxLength={LIMITS.headline} value={f.headline} onChange={set("headline")} /><div className="help">Wrap one or two words in *stars* for the red italic accent.</div>{err("headline")}{hit("headline") && <div className="a-err">{hit("headline")!.text}</div>}</div>
            <div className="a-fld"><label htmlFor="body">Body {kind === "new_lots" && <span className="muted" style={{ fontWeight: 400 }}>· optional, above the lot table</span>}</label><textarea id="body" name="body" className="a-textarea tall" maxLength={LIMITS.body} value={f.body} onChange={set("body")} /><div className="help">Plain text. A blank line starts a new paragraph.</div>{err("body")}{hit("body") && <div className="a-err">{hit("body")!.text}</div>}</div>
            <div className="a-row">
              <div className="a-fld"><label htmlFor="buttonLabel">Button label <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label><input id="buttonLabel" name="buttonLabel" className="a-input" maxLength={LIMITS.buttonLabel} value={f.buttonLabel} onChange={set("buttonLabel")} />{err("buttonLabel")}</div>
              <div className="a-fld"><label htmlFor="buttonPath">Button link</label><div className="a-input affix-l"><span className="affix l">auraprotocols.com</span><input id="buttonPath" name="buttonPath" maxLength={LIMITS.buttonPath} value={f.buttonPath} onChange={set("buttonPath")} placeholder="/products" /></div>{err("buttonPath")}</div>
            </div>
          </div></div>

        <div className="a-fsec"><div className="a-fsec-h"><h3>Audience</h3><span>confirmed subscribers; blocked accounts never receive email</span></div>
          <div className="a-fsec-b"><div className="a-aud" role="radiogroup" aria-label="Audience">{AUDIENCES.map((a) => (
            <label key={a} className={f.audience === a ? "on" : undefined}>
              <input type="radio" name="audience" value={a} checked={f.audience === a} onChange={set("audience")} className="sr-only" />
              <b>{AUDIENCE_LABEL[a]}</b><span>{p.audienceCounts[a].toLocaleString("en-US")} people</span>
            </label>
          ))}</div>{err("audience")}</div></div>

        <div className="a-fsec"><div className="a-fsec-h"><h3>Checks</h3><span>{c ? (blocked ? `${checks.filter((x) => x.level === "block").length} problem blocks sending` : "must pass before sending") : "run when you save"}</span></div>
          <div className="a-fsec-b"><div className="a-checks">{checks.map((x, i) => (
            <div key={i} className={`ck ${x.level === "block" ? "bad" : x.level}`}><Icon name={x.level === "ok" ? "check" : x.level === "warn" ? "info" : "warn"} /><span>{x.text}</span></div>
          ))}</div></div></div>
      </form>

        {/* Outside the campaign form: the Schedule/Send dialogs carry forms of
            their own, and forms can't nest. Save submits via form="campaign-form". */}
        <div className="a-savebar">
          <span className="msg" style={blocked && savedClean ? { color: "var(--specimen)" } : undefined}><Icon name={blocked && savedClean ? "warn" : "check"} />{status}</span>
          <div className="r">
            <button type="submit" form="campaign-form" className="a-btn" disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>
            {c && <button type="submit" form="test-form" className="a-btn" disabled={!savedClean || testing}><Icon name="mail" />Send test to me</button>}
            {!c && <button type="button" className="a-btn" disabled><Icon name="mail" />Send test to me</button>}
            {c ? <ScheduleDialog id={c.id} defaultLocal={p.defaultScheduleLocal ?? ""} disabled={!canSend} /> : <button type="button" className="a-btn" disabled><Icon name="clock" />Schedule…</button>}
            {c ? <SendDialog id={c.id} from="draft" name={f.name} subject={f.subject} audienceLabel={AUDIENCE_LABEL[f.audience]} recipients={p.audienceCounts[f.audience]} lastTest={p.lastTest ?? null} disabled={!canSend} /> : <button type="button" className="a-btn primary" disabled><Icon name="send" />Send now…</button>}
          </div>
          {(saveState?.ok || testState?.ok || testState?.error || saveState?.error) && <div className="a-flash" role="status">{testState?.error ?? saveState?.error ?? testState?.ok ?? saveState?.ok}</div>}
        </div>
      </div>
      {/* hidden: this form has no visible fields — it only exists so the
          "Send test to me" button (form="test-form") can submit it. Without
          `hidden` it still sits in `.a-ed`'s grid as an empty cell. */}
      {c && <form action={test} id="test-form" hidden><input type="hidden" name="id" value={c.id} /></form>}

      <div className={`a-sticky${tab === "edit" ? " a-hide-phone" : ""}`}><EmailPreview input={preview} site={p.site} mailingAddress={p.mailingAddress} /></div>

      {c && (
        <div className="a-psticky a-only-phone">
          <button type="submit" form="test-form" className="a-btn" disabled={!savedClean || testing}><Icon name="mail" />Test to me</button>
          {canSend
            ? <SendDialog id={c.id} dialogKey={`${c.id}-m`} from="draft" name={f.name} subject={f.subject} audienceLabel={AUDIENCE_LABEL[f.audience]} recipients={p.audienceCounts[f.audience]} lastTest={p.lastTest ?? null} disabled={!canSend} triggerLabel="Send…" />
            : <button type="button" className="a-btn primary" disabled><Icon name="send" />Send…</button>}
        </div>
      )}
    </div>
  );
}
