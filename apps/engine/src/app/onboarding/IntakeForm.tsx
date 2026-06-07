"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BUDGET_TIER_LABELS } from "@/lib/constants";
import type { BudgetTierId } from "@/lib/constants";
import { emptyIntakeState } from "@/lib/profile/intake-state";
import type { IntakeState } from "@/lib/profile/intake-state";

const LBS_PER_KG = 2.2046226218;
function toKg(weight: string, unit: "lbs" | "kg"): number | null {
  const n = parseFloat(weight);
  if (!Number.isFinite(n)) return null;
  const kg = unit === "lbs" ? n / LBS_PER_KG : n;
  return Math.round(kg * 10) / 10;
}

const ACTIVITY_LABELS = { sedentary: "Sedentary", moderate: "Moderate", active: "Active", athlete: "Athlete" };
const GOAL_LABELS = {
  recovery: "Recovery & Injury Repair",
  body_comp: "Body Composition",
  sleep_stress: "Sleep & Stress",
  performance: "Athletic Performance",
  longevity: "Longevity",
};
const GLP1_LABELS = { never: "Never used", current: "Currently taking", recently_stopped: "Recently stopped" };
const MENOPAUSE_LABELS = { pre: "Pre-menopausal", peri: "Perimenopausal", post: "Post-menopausal", not_applicable: "Not applicable" };

const SAVE_ERROR = "Couldn't save your answers. Check your connection and try again.";

async function postProfile(data: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return res.ok;
  } catch {
    return false;
  }
}

export default function IntakeForm({ initial }: { initial?: IntakeState }) {
  const router = useRouter();
  const seed = initial ?? emptyIntakeState();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step1, setStep1] = useState(seed.step1);
  const [step2, setStep2] = useState(seed.step2);
  const [step3, setStep3] = useState(seed.step3);

  async function nextStep1() {
    setSaving(true); setError(null);
    const ok = await postProfile({
      age: step1.age ? parseInt(step1.age, 10) : null,
      biological_sex: step1.biological_sex || null,
      weight_kg: toKg(step1.weight, step1.weight_unit),
      activity_level: step1.activity_level || null,
    });
    setSaving(false);
    if (!ok) { setError(SAVE_ERROR); return; }
    setStep(2);
  }

  async function nextStep2() {
    setSaving(true); setError(null);
    const ok = await postProfile({
      primary_goal: step2.primary_goal || null,
      current_medications: step2.current_medications || null,
      using_peptides: step2.using_peptides,
      peptides_detail: step2.peptides_detail || null,
      glp1_status: step2.glp1_status || null,
      glp1_stopped_month: step2.glp1_status === "recently_stopped" ? (step2.glp1_stopped_month || null) : null,
      menopause_status: step1.biological_sex === "female" ? (step2.menopause_status || null) : null,
    });
    setSaving(false);
    if (!ok) { setError(SAVE_ERROR); return; }
    setStep(3);
  }

  async function finish() {
    setSaving(true); setError(null);
    const ok = await postProfile({
      interested_in_rx: step3.interested_in_rx,
      budget_tier: step3.budget_tier || null,
      onboarding_complete: true,
    });
    setSaving(false);
    if (!ok) { setError(SAVE_ERROR); return; }
    router.push("/dashboard");
  }

  const inputClass = "w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30";
  const labelClass = "block mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider";
  const btnPrimary = "w-full rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-[#04060f] transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? "bg-cyan-500" : "bg-white/10"}`} />
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Age</label>
            <input type="number" className={inputClass} placeholder="e.g. 34" value={step1.age} onChange={(e) => setStep1({ ...step1, age: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Biological Sex</label>
            <select className={inputClass} value={step1.biological_sex} onChange={(e) => setStep1({ ...step1, biological_sex: e.target.value })}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Weight</label>
            <div className="flex gap-2">
              <input type="number" inputMode="decimal" className={inputClass + " flex-1 min-w-0"} placeholder={step1.weight_unit === "lbs" ? "e.g. 180" : "e.g. 80"} value={step1.weight} onChange={(e) => setStep1({ ...step1, weight: e.target.value })} />
              <select className="w-24 flex-none rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30" value={step1.weight_unit} onChange={(e) => setStep1({ ...step1, weight_unit: e.target.value as "lbs" | "kg" })}>
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Activity Level</label>
            <select className={inputClass} value={step1.activity_level} onChange={(e) => setStep1({ ...step1, activity_level: e.target.value })}>
              <option value="">Select…</option>
              {Object.entries(ACTIVITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <button className={btnPrimary} onClick={nextStep1} disabled={saving}>
            {saving ? "Saving…" : "Continue →"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Primary Goal</label>
            <select className={inputClass} value={step2.primary_goal} onChange={(e) => setStep2({ ...step2, primary_goal: e.target.value })}>
              <option value="">Select…</option>
              {Object.entries(GOAL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Current Medications (optional)</label>
            <textarea className={inputClass + " h-20 resize-none"} placeholder="List any prescription medications, supplements, or peptides you're currently taking" value={step2.current_medications} onChange={(e) => setStep2({ ...step2, current_medications: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="using_peptides" className="h-4 w-4 rounded border-white/20 bg-white/5 accent-cyan-500" checked={step2.using_peptides} onChange={(e) => setStep2({ ...step2, using_peptides: e.target.checked })} />
            <label htmlFor="using_peptides" className="text-sm text-slate-300">Currently using peptides</label>
          </div>
          {step2.using_peptides && (
            <div>
              <label className={labelClass}>Which peptides?</label>
              <input type="text" className={inputClass} placeholder="e.g. BPC-157, TB-500" value={step2.peptides_detail} onChange={(e) => setStep2({ ...step2, peptides_detail: e.target.value })} />
            </div>
          )}
          <div>
            <label className={labelClass}>GLP-1 history</label>
            <select className={inputClass} value={step2.glp1_status} onChange={(e) => setStep2({ ...step2, glp1_status: e.target.value })}>
              <option value="">Select…</option>
              {Object.entries(GLP1_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {step2.glp1_status === "recently_stopped" && (
            <div>
              <label className={labelClass}>When did you stop? (month)</label>
              <input type="month" className={inputClass} value={step2.glp1_stopped_month} onChange={(e) => setStep2({ ...step2, glp1_stopped_month: e.target.value })} />
            </div>
          )}
          {step1.biological_sex === "female" && (
            <div>
              <label className={labelClass}>Menopause status</label>
              <select className={inputClass} value={step2.menopause_status} onChange={(e) => setStep2({ ...step2, menopause_status: e.target.value })}>
                <option value="">Select…</option>
                {Object.entries(MENOPAUSE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3">
            <button className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/20" onClick={() => setStep(1)}>← Back</button>
            <button className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-[#04060f] transition hover:bg-cyan-400 disabled:opacity-50" onClick={nextStep2} disabled={saving}>
              {saving ? "Saving…" : "Continue →"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Interested in a prescription protocol?</label>
            <p className="mb-3 text-xs text-slate-500">If yes, we'll show you Aura Clinical options alongside research-grade vendors.</p>
            <div className="flex gap-3">
              {[{ v: true, l: "Yes, show me Rx options" }, { v: false, l: "No, research-grade only" }].map(({ v, l }) => (
                <button
                  key={String(v)}
                  onClick={() => setStep3({ ...step3, interested_in_rx: v })}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${step3.interested_in_rx === v ? "border-cyan-500 bg-cyan-500/10 text-cyan-300" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Monthly Budget</label>
            <select className={inputClass} value={step3.budget_tier} onChange={(e) => setStep3({ ...step3, budget_tier: e.target.value })}>
              <option value="">Select…</option>
              {(Object.entries(BUDGET_TIER_LABELS) as [BudgetTierId, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/20" onClick={() => setStep(2)}>← Back</button>
            <button className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-[#04060f] transition hover:bg-cyan-400 disabled:opacity-50" onClick={finish} disabled={saving}>
              {saving ? "Finalizing…" : "Unlock Protocol →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
