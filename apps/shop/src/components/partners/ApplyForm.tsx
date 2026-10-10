"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { applyPartnerAction, type ApplyState } from "@/app/partners/actions";
import { AUDIENCE_SIZES, PARTNER_TYPES, PUBLISH_CHANNELS } from "@/lib/partners/codes";

// Option A "Application record" (approved 2026-10-10, options page 7PyXYECNxNbjnEEp6JuLW7):
// the form is one raised panel in three numbered sections; the partner placard sits beside
// it with the agreement and Submit. Field names are unchanged (applyPartnerAction).
export default function ApplyForm({ codePct }: { codePct: number }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyPartnerAction, undefined);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setPicked((p) => ({ ...p, [id]: !p[id] }));
  const channels = [...PUBLISH_CHANNELS.map((c) => ({ id: c.id, label: c.label })), { id: "other", label: "Other · website, newsletter or forum" }];
  const groups = [["research", "Research & clinical"], ["media", "Media & community"]] as const;

  // Submit through onSubmit, not the form's action prop: React resets a form after an
  // action runs, which would wipe every answer when the server sends back an error.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <form onSubmit={submit} className="s-ap-grid">
      <div className="s-ap-panel">
        <fieldset className="s-ap-sec">
          <span className="s-ap-n" aria-hidden="true">1</span>
          <div>
            <legend className="s-ap-h">Who you are</legend>
            <p className="s-ap-sub">Pick the one that fits best.</p>
            {groups.map(([g, label]) => (
              <div key={g}>
                <p className="s-ap-grp">{label}</p>
                <div className="s-ap-roles">
                  {PARTNER_TYPES.filter((t) => t.group === g).map((t) => (
                    <label key={t.id} className="s-ap-role">
                      <input type="radio" name="partnerType" value={t.id} required />
                      <b>{t.label}</b><span>{t.hint}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="s-ap-sec">
          <span className="s-ap-n" aria-hidden="true">2</span>
          <div>
            <legend className="s-ap-h">Where you publish</legend>
            <p className="s-ap-sub">Choose every place, then add the handle or link.</p>
            <div className="s-ap-chips">
              {channels.map((c) => (
                <label key={c.id} className="s-ap-chip">
                  <input type="checkbox" name={`ch_${c.id}`} checked={!!picked[c.id]} onChange={() => toggle(c.id)} />
                  {c.label}
                </label>
              ))}
            </div>
            {channels.some((c) => picked[c.id]) && (
              <div className="s-ap-handles">
                {PUBLISH_CHANNELS.filter((c) => picked[c.id]).map((c) => (
                  <div key={c.id} className="s-ap-handle">
                    <label htmlFor={`ap-h-${c.id}`}>{c.label}</label>
                    <input id={`ap-h-${c.id}`} name={`h_${c.id}`} aria-label={`${c.label} handle or link`} placeholder={c.placeholder} maxLength={200} required className="s-ap-in" />
                  </div>
                ))}
                {picked.other && (
                  <div className="s-ap-handle">
                    <label htmlFor="ap-h-other">Other</label>
                    <textarea id="ap-h-other" name="h_other" aria-label="Other places you publish" rows={2} maxLength={500} required className="s-ap-in" placeholder="e.g. smithlab.org/journal-club — methods newsletter, 4,000 subscribers" />
                  </div>
                )}
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className="s-ap-sec">
          <span className="s-ap-n" aria-hidden="true">3</span>
          <div>
            <legend className="s-ap-h">Your audience</legend>
            <p className="s-ap-sub">Roughly how many people see what you publish, across every place above.</p>
            <div className="s-ap-sizes" role="radiogroup" aria-label="Audience size">
              {AUDIENCE_SIZES.map((a) => (
                <label key={a.id}><input type="radio" name="audienceSize" value={a.id} required />{a.label}</label>
              ))}
            </div>
            <label htmlFor="ap-promo" className="s-ap-lbl">How you&apos;ll share Aura *</label>
            <textarea id="ap-promo" name="promotion" rows={3} minLength={3} maxLength={1000} required aria-required="true" className="s-ap-in"
              placeholder="e.g. methods segments in our journal-club video, citing the lot certificate for any compound we discuss" />
          </div>
        </fieldset>
      </div>

      <div className="s-ap-side">
        <div className="s-pp-tile" aria-hidden>
          <div className="s-pp-placard">
            <span className="s-pp-k">Partner application</span>
            <span className="s-pp-n">Your code</span>
            <dl>
              <dt>Reply</dt><dd>2 business days</dd>
              <dt>Code</dt><dd>on approval</dd>
              <dt>Audience</dt><dd>saves {codePct}%</dd>
            </dl>
            <span className="s-placard-r">Research use only · Not for human use</span>
          </div>
          <div className="s-pp-code s-pp-tag s-ap-code"><span>Your code</span><b>K7M2Q9XP</b><i>on approval</i></div>
        </div>
        <div className="s-ap-submit">
          <label className="s-chk s-ap-agree"><input type="checkbox" name="agree" required /><span>I&apos;ve read and accept the <Link href="/partner-agreement" target="_blank">Partner Agreement</Link>, including the research-use-only content rules and the disclosure requirement.</span></label>
          {state?.error && <p role="alert" className="text-sm text-[color:var(--specimen)] mt-2">{state.error}</p>}
          <button type="submit" className="s-atc" disabled={pending}>{pending ? "Submitting…" : "Submit application →"}</button>
          <p className="s-ap-note">We reply by email, usually within two business days. Your code is a random one like the tag above; you can change it any time from your dashboard, and codes you&apos;ve already shared keep working.</p>
        </div>
      </div>
    </form>
  );
}
