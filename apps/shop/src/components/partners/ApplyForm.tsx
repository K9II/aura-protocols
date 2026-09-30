"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { applyPartnerAction, type ApplyState } from "@/app/partners/actions";
import { AUDIENCE_SIZES, PARTNER_TYPES, PUBLISH_CHANNELS } from "@/lib/partners/codes";

const field = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm mb-4";
const groupLabel: React.CSSProperties = {};

export default function ApplyForm() {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyPartnerAction, undefined);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setPicked((p) => ({ ...p, [id]: !p[id] }));

  const groups = [["research", "Research & clinical"], ["media", "Media & community"]] as const;
  return (
    <form action={action} className="s-partner-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 48, maxWidth: 980 }}>
      <div>
        <p className="s-micro mb-2">I&apos;m applying as</p>
        {groups.map(([g, label]) => (
          <div key={g}>
            <p className="s-micro text-[color:var(--ink-soft)] mt-3 mb-2" style={groupLabel}>{label}</p>
            <div className="s-calc-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 8px" }}>
              {PARTNER_TYPES.filter((t) => t.group === g).map((t) => (
                <label key={t.id} className="s-chk"><input type="radio" name="partnerType" value={t.id} required /><span><b>{t.label}</b> · {t.hint}</span></label>
              ))}
            </div>
          </div>
        ))}
        <p className="s-micro mb-2 mt-5">Where you publish</p>
        {PUBLISH_CHANNELS.map((c) => (
          <div key={c.id}>
            <label className="s-chk"><input type="checkbox" name={`ch_${c.id}`} checked={!!picked[c.id]} onChange={() => toggle(c.id)} /><span><b>{c.label}</b></span></label>
            {picked[c.id] && <input name={`h_${c.id}`} aria-label={`${c.label} handle or link`} placeholder={c.placeholder} maxLength={200} required className={field} />}
          </div>
        ))}
        <label className="s-chk"><input type="checkbox" name="ch_other" checked={!!picked.other} onChange={() => toggle("other")} /><span><b>Other</b> · website, newsletter or forum</span></label>
        {picked.other && <textarea name="h_other" aria-label="Other places you publish" rows={2} maxLength={500} required placeholder="e.g. smithlab.org/journal-club — methods newsletter, 4,000 subscribers" className={field} />}
        <label htmlFor="ap-size" className="s-micro block mb-1.5">Audience size</label>
        <select id="ap-size" name="audienceSize" required defaultValue="" className={field}>
          <option value="" disabled>Choose one</option>
          {AUDIENCE_SIZES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <label htmlFor="ap-promo" className="s-micro block mb-1.5">How you&apos;ll share Aura</label>
        <textarea id="ap-promo" name="promotion" rows={3} maxLength={1000} required className={field} />
      </div>
      <div>
        <div style={{ border: "1px solid var(--line)", padding: "16px 18px", marginBottom: 22 }}>
          <p className="s-micro mb-1.5">Your code</p>
          <p className="text-[14px]">We&apos;ll issue your partner code when you&apos;re approved (a random code such as <b>K7M2Q9XP</b>).</p>
          <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-1.5">You can change it any time from your dashboard. Codes you&apos;ve already shared keep working.</p>
        </div>
        <label className="s-chk"><input type="checkbox" name="agree" required /><span>I&apos;ve read and accept the <Link href="/partner-agreement" target="_blank">Partner Agreement</Link>, including the research-use-only content rules and the disclosure requirement.</span></label>
        {state?.error && <p role="alert" className="text-sm text-[color:var(--specimen)] mt-2">{state.error}</p>}
        <button type="submit" className="s-atc" disabled={pending}>{pending ? "Submitting…" : "Submit application →"}</button>
        <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-3">We reply by email, usually within two business days. Your code isn&apos;t active until you&apos;re approved.</p>
      </div>
    </form>
  );
}
