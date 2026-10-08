"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enableWholesaleAction } from "@/app/wholesale/actions";
import { DEFAULT_RESEARCH_FIELD, RESEARCH_FIELDS, RESEARCH_FIELD_LABEL, RESEARCH_ORG_MAX, type ResearchField } from "@/lib/account/research";
import { WHOLESALE_TERMS } from "@/lib/wholesale/rules";

const field = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3 py-2.5 text-[13px] mb-3";

// Mock w3: research fields only when not yet verified; the terms; one checkbox.
export default function WholesaleTurnOn({ needsResearch, organization }: { needsResearch: boolean; organization: string | null }) {
  const router = useRouter();
  const [researchField, setResearchField] = useState<ResearchField>(DEFAULT_RESEARCH_FIELD);
  const [org, setOrg] = useState(organization ?? "");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await enableWholesaleAction({ agree, research: needsResearch ? { field: researchField, org: org.trim() } : undefined });
      if (r.ok) { router.refresh(); return; }
      setError(r.error ?? "Something went wrong — please try again.");
    } catch {
      setError("Something went wrong — please try again.");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="s-research" style={{ maxWidth: 560 }}>
      <div className="s-research-h"><span className="s-micro" style={{ color: "var(--ink)" }}>Turn on wholesale</span><span className="s-micro">One time only</span></div>
      <div className="s-research-b">
        {needsResearch && (
          <>
            <label htmlFor="ws-field" className="s-micro block mb-1">Field of qualified research *</label>
            <select id="ws-field" value={researchField} onChange={(e) => setResearchField(e.target.value as ResearchField)} required className={field}>
              {RESEARCH_FIELDS.map((f) => <option key={f} value={f}>{RESEARCH_FIELD_LABEL[f]}</option>)}
            </select>
            <label htmlFor="ws-org" className="s-micro block mb-1">Company or institution *</label>
            <input id="ws-org" value={org} onChange={(e) => setOrg(e.target.value)} maxLength={RESEARCH_ORG_MAX} required autoComplete="organization" className={field} />
          </>
        )}
        <ul className="s-ws-terms">{WHOLESALE_TERMS.map((t) => <li key={t}>{t}</li>)}</ul>
        <label className="s-chk"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I agree to the wholesale terms.</span></label>
        {error && <p role="alert" className="mt-3 text-sm text-[color:var(--specimen)]">{error}</p>}
        <button type="submit" className="s-ws-btn" disabled={!agree || busy}>{busy ? "Turning on…" : "Turn on wholesale"}</button>
      </div>
    </form>
  );
}
