"use client";

import { useMemo, useState } from "react";
import RecommendationCard from "@/components/RecommendationCard";
import type { TelemetryDisplay } from "@/components/RecommendationCard";
import VendorRail from "@/components/VendorRail";
import type { ProtocolOutput, RulesSummary, Tension } from "@/lib/recommend/schema";
import type { RoutingDecision } from "@/components/ClinicalRouter";
import { routeByVendor, type RailItem } from "@/lib/recommend/vendor-router";
import { products } from "@/data/products";
import { PROTOCOL_LABELS } from "@/lib/constants";
import { applySafetyFloor, pickTemplate } from "@/lib/recommend/rules";
import { SIG } from "@/lib/theme/instrument";
import type { BiometricSnapshot } from "@/lib/terra/schema";
import type { ProfileContext } from "@/lib/profile/schema";

// ─── Label maps ───────────────────────────────────────────────────────────────

const ACTIVITY_LABELS = { sedentary: "Sedentary", moderate: "Moderate", active: "Active", athlete: "Athlete" };
const GOAL_LABELS = {
  recovery: "Recovery & Injury Repair",
  body_comp: "Body Composition",
  sleep_stress: "Sleep & Stress",
  performance: "Athletic Performance",
  longevity: "Longevity",
};
const MENOPAUSE_LABELS = { pre: "Pre-menopausal", peri: "Perimenopausal", post: "Post-menopausal", not_applicable: "Not applicable" };
const GLP1_LABELS = { never: "Never used", recently_stopped: "Stopped recently", current: "Currently using" };

// Per-wearable swatch identity, remapped to the muted instrument palette so no
// legacy neon literals remain (see src/lib/theme/instrument.ts).
const WEARABLES = [
  { id: "HUME",   label: "Hume",       icon: "◆", color: SIG.ink },
  { id: "WHOOP",  label: "Whoop",      icon: "⬡", color: SIG.alert },
  { id: "OURA",   label: "Oura Ring",  icon: "◎", color: SIG.llm },
  { id: "GARMIN", label: "Garmin",     icon: "⬡", color: SIG.bio },
  { id: "FITBIT", label: "Fitbit",     icon: "◈", color: SIG.ok },
  { id: "DEXCOM", label: "Dexcom CGM", icon: "◉", color: SIG.warn },
] as const;

// ─── Biometric series matching each scenario's telemetry (for rules engine) ──

type ScenarioKey = "METABOLIC" | "RECOVERY" | "GH" | "SLEEP_STRESS";

const SCENARIO_SERIES: Record<ScenarioKey, BiometricSnapshot[]> = {
  METABOLIC: Array.from({ length: 7 }, () => ({
    source: "OURA", capturedAt: "2026-06-01T07:00:00Z",
    recoveryScore: 42, hrvMs: 28, restingHrBpm: 62, sleepHours: 6.2,
    glucoseAvgMgdl: 107, glucoseVariability: 38,
  })),
  RECOVERY: Array.from({ length: 7 }, () => ({
    source: "WHOOP", capturedAt: "2026-06-01T07:00:00Z",
    recoveryScore: 31, hrvMs: 38, restingHrBpm: 58, sleepHours: 7.0,
  })),
  GH: Array.from({ length: 7 }, () => ({
    source: "OURA", capturedAt: "2026-06-01T07:00:00Z",
    recoveryScore: 58, hrvMs: 51, restingHrBpm: 55, sleepHours: 5.7,
  })),
  SLEEP_STRESS: Array.from({ length: 7 }, () => ({
    source: "GARMIN", capturedAt: "2026-06-01T07:00:00Z",
    recoveryScore: 38, hrvMs: 22, restingHrBpm: 68, sleepHours: 5.9,
  })),
};

// ─── Onboarding form (fully controlled) ──────────────────────────────────────

interface CollectedProfile {
  age?: number;
  weight_kg?: number;
  biological_sex?: ProfileContext["biological_sex"];
  primary_goal?: ProfileContext["primary_goal"];
  activity_level?: ProfileContext["activity_level"];
  menopause_status?: ProfileContext["menopause_status"];
  glp1_status?: ProfileContext["glp1_status"];
  glp1_stopped_month?: string;
  current_medications?: string;
  using_peptides?: boolean;
  peptides_detail?: string;
}

function DemoIntakeForm({ onComplete }: { onComplete: (profile: CollectedProfile) => void }) {
  const [step, setStep] = useState(1);

  // Step 1 — wearable gate
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<string | null>(null);

  // Step 2 — goal + demographics
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [ageStr, setAgeStr] = useState("");
  const [sex, setSex] = useState("");
  const [weightStr, setWeightStr] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [activityLevel, setActivityLevel] = useState("");

  // Step 3 — clinical
  const [medications, setMedications] = useState("");
  const [usingPeptides, setUsingPeptides] = useState(false);
  const [peptidesDetail, setPeptidesDetail] = useState("");
  const [glp1Status, setGlp1Status] = useState("");
  const [glp1StoppedMonth, setGlp1StoppedMonth] = useState("");
  const [menopauseStatus, setMenopauseStatus] = useState("");

  // Step 4 — preferences
  const [rxInterest, setRxInterest] = useState<"yes" | "no" | null>(null);
  const [budgetTier, setBudgetTier] = useState("");

  const inputClass = "w-full bg-[color:var(--paper)] border border-[color:var(--line)] px-4 py-2.5 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--specimen)] focus:outline-none";
  const labelClass = "block mb-1 text-xs font-semibold text-[color:var(--ink-soft)] uppercase tracking-wider";
  const btnBack = "flex-1 p-btn-outline px-4 py-3 text-sm font-medium";
  const btnNext = "flex-1 p-btn-primary px-4 py-3 text-sm font-bold";

  function handleConnect(id: string) {
    setConnecting(id);
    setTimeout(() => { setConnecting(null); setConnected(id); }, 1400);
  }

  function handleComplete() {
    const rawWeight = parseFloat(weightStr);
    const weight_kg = weightStr
      ? (weightUnit === "lbs" ? Math.round(rawWeight * 0.453592 * 10) / 10 : rawWeight)
      : undefined;
    onComplete({
      age: ageStr ? parseInt(ageStr, 10) : undefined,
      weight_kg: weight_kg && weight_kg >= 30 && weight_kg <= 300 ? weight_kg : undefined,
      biological_sex: sex ? (sex as ProfileContext["biological_sex"]) : undefined,
      primary_goal: primaryGoal ? (primaryGoal as ProfileContext["primary_goal"]) : undefined,
      activity_level: activityLevel ? (activityLevel as ProfileContext["activity_level"]) : undefined,
      menopause_status: menopauseStatus ? (menopauseStatus as ProfileContext["menopause_status"]) : undefined,
      glp1_status: glp1Status ? (glp1Status as ProfileContext["glp1_status"]) : undefined,
      glp1_stopped_month: glp1Status === "recently_stopped" ? glp1StoppedMonth || undefined : undefined,
      current_medications: medications.trim() || undefined,
      using_peptides: usingPeptides,
      peptides_detail: usingPeptides && peptidesDetail ? peptidesDetail : undefined,
    });
  }

  // Progress bar covers content steps 2-4 only (3 segments).
  const progressStep = step - 1;

  return (
    <div>
      {step > 1 && (
        <div className="mb-6 flex gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= progressStep ? "bg-[color:var(--specimen)]" : "bg-[color:var(--line)]"}`} />
          ))}
        </div>
      )}

      {/* STEP 1 — Wearable gate */}
      {step === 1 && (
        <div className="space-y-5">
          <p className="text-sm text-[color:var(--ink-soft)]">
            Your protocol is personalized from real biometric data. Connect a supported wearable to continue.
          </p>

          <div className="space-y-2">
            {WEARABLES.map((w) => {
              const isConnecting = connecting === w.id;
              const isConnected = connected === w.id;
              // Hume has no direct Terra integration yet — arrives later via the
              // native app (Apple Health / Health Connect through Terra's SDK).
              const comingSoon = w.id === "HUME";
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between border px-4 py-3 transition-colors"
                  style={{
                    borderColor: isConnected ? SIG.ok : SIG.line,
                    background: isConnected ? SIG.okTint : SIG.paper,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg" style={{ color: w.color }}>{w.icon}</span>
                    <span className="text-sm font-medium text-[color:var(--ink)]">{w.label}</span>
                    {w.id === "DEXCOM" && (
                      <span className="text-xs text-[color:var(--ink-faint)] bg-[color:var(--paper-deep)] border border-[color:var(--line)] px-2 py-0.5 rounded">CGM</span>
                    )}
                  </div>
                  {comingSoon ? (
                    <span className="px-3 py-1 text-xs font-semibold tracking-wider" style={{ background: SIG.paperDeep, border: `1px solid ${SIG.line}`, color: SIG.inkFaint }}>Coming soon</span>
                  ) : isConnected ? (
                    <span className="text-xs font-semibold tracking-wider" style={{ color: SIG.ok }}>● Connected</span>
                  ) : (
                    <button
                      onClick={() => handleConnect(w.id)}
                      disabled={isConnecting || connected !== null}
                      className="px-4 py-1.5 text-xs font-semibold transition disabled:opacity-40"
                      style={{ background: SIG.alertTint, border: `1px solid ${SIG.alert}`, color: SIG.alert }}
                    >
                      {isConnecting ? "Connecting…" : "Connect"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-[color:var(--line)] pt-4">
            <a href="https://shop.auraprotocols.com" className="text-xs text-[color:var(--ink-faint)] underline underline-offset-2 transition hover:text-[color:var(--specimen)]">
              Not ready yet? Browse the shop →
            </a>
            <button
              className="p-btn-primary px-5 py-2.5 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!connected}
              onClick={() => setStep(2)}
            >
              {connected ? "Continue →" : "Connect to continue"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Goal + Demographics */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Primary Goal</label>
            <select className={inputClass} value={primaryGoal} onChange={(e) => setPrimaryGoal(e.target.value)}>
              <option value="">Select…</option>
              {Object.entries(GOAL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Age</label>
            <input type="number" className={inputClass} placeholder="e.g. 34" value={ageStr} onChange={(e) => setAgeStr(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Biological Sex</label>
            <select className={inputClass} value={sex} onChange={(e) => setSex(e.target.value)}>
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
              <input
                type="number" className={inputClass + " flex-1 min-w-0"} placeholder="e.g. 180"
                value={weightStr} onChange={(e) => setWeightStr(e.target.value)}
              />
              <select
                className="w-24 flex-none bg-[color:var(--paper)] border border-[color:var(--line)] px-3 py-2.5 text-sm text-[color:var(--ink)] focus:border-[color:var(--specimen)] focus:outline-none"
                value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as "lbs" | "kg")}
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Activity Level</label>
            <select className={inputClass} value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
              <option value="">Select…</option>
              {Object.entries(ACTIVITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button className={btnBack} onClick={() => setStep(1)}>← Back</button>
            <button className={btnNext} onClick={() => setStep(3)}>Continue →</button>
          </div>
        </div>
      )}

      {/* STEP 3 — Clinical Context */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Current Medications <span className="normal-case font-normal text-[color:var(--ink-faint)]">(optional — safety screening)</span></label>
            <textarea
              className={inputClass + " resize-none"}
              rows={3}
              placeholder="e.g. metformin 500mg, levothyroxine 75mcg, warfarin…"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox" id="demo_using_peptides"
              className="h-4 w-4 border border-[color:var(--line)] bg-[color:var(--paper)] accent-[color:var(--specimen)]"
              checked={usingPeptides} onChange={(e) => setUsingPeptides(e.target.checked)}
            />
            <label htmlFor="demo_using_peptides" className="text-sm text-[color:var(--ink-soft)]">Currently using peptides</label>
          </div>
          {usingPeptides && (
            <div>
              <label className={labelClass}>Which peptides?</label>
              <input type="text" className={inputClass} placeholder="e.g. BPC-157, TB-500" value={peptidesDetail} onChange={(e) => setPeptidesDetail(e.target.value)} />
            </div>
          )}
          <div>
            <label className={labelClass}>GLP-1 history</label>
            <select className={inputClass} value={glp1Status} onChange={(e) => setGlp1Status(e.target.value)}>
              <option value="">Select…</option>
              {Object.entries(GLP1_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {glp1Status === "recently_stopped" && (
            <div>
              <label className={labelClass}>When did you stop? (month)</label>
              <input type="month" className={inputClass} value={glp1StoppedMonth} onChange={(e) => setGlp1StoppedMonth(e.target.value)} />
            </div>
          )}
          {sex === "female" && (
            <div>
              <label className={labelClass}>Menopause status</label>
              <select className={inputClass} value={menopauseStatus} onChange={(e) => setMenopauseStatus(e.target.value)}>
                <option value="">Select…</option>
                {Object.entries(MENOPAUSE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3">
            <button className={btnBack} onClick={() => setStep(2)}>← Back</button>
            <button className={btnNext} onClick={() => setStep(4)}>Continue →</button>
          </div>
        </div>
      )}

      {/* STEP 4 — Preferences */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Interested in a prescription protocol?</label>
            <p className="mb-3 text-xs text-[color:var(--ink-faint)]">If yes, we&apos;ll show you Modality options alongside research-grade vendors.</p>
            <div className="flex gap-3">
              {([{ v: "yes", l: "Yes, show me Rx options" }, { v: "no", l: "No, research-grade only" }] as const).map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setRxInterest(v)}
                  className={`flex-1 border px-4 py-3 text-sm font-medium transition ${rxInterest === v ? "border-[color:var(--specimen)] bg-[color:var(--sig-alert-tint)] text-[color:var(--specimen)]" : "border-[color:var(--line)] bg-[color:var(--paper)] text-[color:var(--ink-soft)] hover:bg-[color:var(--paper-deep)]"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Monthly Budget</label>
            <select className={inputClass} value={budgetTier} onChange={(e) => setBudgetTier(e.target.value)}>
              <option value="">Select…</option>
              <option value="50_100">$50–$100/month</option>
              <option value="100_200">$100–$200/month</option>
              <option value="200_plus">$200+/month</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button className={btnBack} onClick={() => setStep(3)}>← Back</button>
            <button className={btnNext} onClick={handleComplete}>Generate My Protocol →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Safety Floor panel ───────────────────────────────────────────────────────

function SafetyFloorPanel({
  rules,
  baseCeilings,
  suggestedTemplate,
}: {
  rules: RulesSummary;
  baseCeilings: Record<string, number>;
  suggestedTemplate: string;
}) {
  const hasContra = rules.contraindications.length > 0;
  const hasTriggers = rules.triggers.length > 0;
  const templateChanged = suggestedTemplate !== rules.template;

  const ceilingRows = Object.entries(rules.doseCeilings).map(([key, adjusted]) => {
    const base = baseCeilings[key] ?? adjusted;
    const pct = base > 0 ? Math.round(((adjusted - base) / base) * 100) : 0;
    return { key, adjusted, base, pct };
  });

  return (
    <div className="p-card border border-[color:var(--line)] p-5 mb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-mono font-semibold uppercase tracking-widest text-[color:var(--ink-soft)]">Safety Floor</span>
        <span className="text-xs font-mono text-[color:var(--sig-bio)] bg-[color:var(--sig-bio-tint)] border border-[color:var(--sig-bio)] px-2 py-0.5 rounded">
          {rules.template}
        </span>
        {templateChanged && (
          <span className="text-xs text-[color:var(--sig-llm)] bg-[color:var(--sig-llm-tint)] border border-[color:var(--sig-llm)] px-2 py-0.5 rounded font-mono">
            your profile → {suggestedTemplate}
          </span>
        )}
        {hasContra ? (
          <>
            <span className="text-xs font-semibold text-[color:var(--sig-alert)] bg-[color:var(--sig-alert-tint)] border border-[color:var(--sig-alert)] px-2 py-0.5 rounded">
              ⚠ {rules.contraindications.length} contraindication{rules.contraindications.length > 1 ? "s" : ""}
            </span>
            <span className="text-xs font-semibold text-[color:var(--sig-alert)] bg-[color:var(--sig-alert-tint)] border border-[color:var(--sig-alert)] px-2 py-0.5 rounded">
              → routed to Modality
            </span>
          </>
        ) : (
          <span className="text-xs text-[color:var(--sig-ok)] bg-[color:var(--sig-ok-tint)] border border-[color:var(--sig-ok)] px-2 py-0.5 rounded">
            ✓ no contraindications
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dose ceilings */}
        <div>
          <p className="text-xs uppercase tracking-widest text-[color:var(--ink-soft)] mb-2">Dose Ceilings</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[color:var(--ink-faint)] border-b border-[color:var(--line)]">
                <th className="text-left pb-1.5 font-normal">Compound</th>
                <th className="text-right pb-1.5 font-normal">Base</th>
                <th className="text-right pb-1.5 font-normal">Adjusted</th>
                <th className="text-right pb-1.5 font-normal">Δ</th>
              </tr>
            </thead>
            <tbody>
              {ceilingRows.map(({ key, adjusted, base, pct }) => (
                <tr key={key} className="border-b border-[color:var(--line)] last:border-0">
                  <td className="py-1.5 text-[color:var(--ink-soft)] font-mono pr-3 truncate max-w-[120px]">{key}</td>
                  <td className="py-1.5 text-right text-[color:var(--ink-faint)] tabular-nums">{base}</td>
                  <td className={`py-1.5 text-right font-semibold tabular-nums ${pct < 0 ? "text-[color:var(--sig-warn)]" : pct > 0 ? "text-[color:var(--sig-ok)]" : "text-[color:var(--ink)]"}`}>
                    {adjusted}
                  </td>
                  <td className="py-1.5 text-right tabular-nums pl-3">
                    {pct !== 0 ? (
                      <span className={pct < 0 ? "text-[color:var(--sig-warn)]" : "text-[color:var(--sig-ok)]"}>
                        {pct > 0 ? "+" : ""}{pct}%
                      </span>
                    ) : (
                      <span className="text-[color:var(--ink-faint)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Contraindications + triggers */}
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[color:var(--ink-soft)] mb-2">Contraindications</p>
            {hasContra ? (
              <div className="flex flex-wrap gap-1.5">
                {rules.contraindications.map((c) => (
                  <span key={c} className="text-xs font-mono bg-[color:var(--sig-alert-tint)] border border-[color:var(--sig-alert)] text-[color:var(--sig-alert)] px-2 py-0.5 rounded">
                    ● {c}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[color:var(--ink-faint)]">None detected</span>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-[color:var(--ink-soft)] mb-2">Triggers</p>
            {hasTriggers ? (
              <div className="flex flex-wrap gap-1.5">
                {rules.triggers.map((t) => (
                  <span key={t} className="text-xs font-mono bg-[color:var(--sig-warn-tint)] border border-[color:var(--sig-warn)] text-[color:var(--sig-warn)] px-2 py-0.5 rounded">
                    ◎ {t}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[color:var(--ink-faint)]">None</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Live profile editor (inline in terminal) ─────────────────────────────────

function LiveProfileBar({
  value,
  onChange,
}: {
  value: CollectedProfile;
  onChange: (p: CollectedProfile) => void;
}) {
  const inputClass = "bg-[color:var(--paper)] border border-[color:var(--line)] px-3 py-1.5 text-xs text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--specimen)] focus:outline-none";

  return (
    <div className="border border-[color:var(--sig-llm)] bg-[color:var(--sig-llm-tint)] px-4 py-3 mb-5">
      <p className="text-xs font-mono uppercase tracking-widest text-[color:var(--sig-llm)] mb-3">
        ◈ Live Profile — edit to see safety floor react
      </p>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block mb-1 text-xs text-[color:var(--ink-soft)]">Age</label>
          <input
            type="number" placeholder="—" className={inputClass + " w-20"}
            value={value.age ?? ""} onChange={(e) => onChange({ ...value, age: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          />
        </div>
        <div>
          <label className="block mb-1 text-xs text-[color:var(--ink-soft)]">Weight (kg)</label>
          <input
            type="number" placeholder="—" className={inputClass + " w-24"}
            value={value.weight_kg ?? ""} onChange={(e) => onChange({ ...value, weight_kg: e.target.value ? parseFloat(e.target.value) : undefined })}
          />
        </div>
        <div>
          <label className="block mb-1 text-xs text-[color:var(--ink-soft)]">Sex</label>
          <select className={inputClass + " w-36"} value={value.biological_sex ?? ""} onChange={(e) => onChange({ ...value, biological_sex: (e.target.value as ProfileContext["biological_sex"]) || undefined })}>
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        {value.biological_sex === "female" && (
          <div>
            <label className="block mb-1 text-xs text-[color:var(--ink-soft)]">Menopause</label>
            <select className={inputClass + " w-36"} value={value.menopause_status ?? ""} onChange={(e) => onChange({ ...value, menopause_status: (e.target.value as ProfileContext["menopause_status"]) || undefined })}>
              <option value="">—</option>
              {Object.entries(MENOPAUSE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}
        <div className="flex-1 min-w-[200px]">
          <label className="block mb-1 text-xs text-[color:var(--ink-soft)]">Medications (type to fire contraindications)</label>
          <input
            type="text" placeholder="e.g. tamoxifen, warfarin, metformin…" className={inputClass + " w-full"}
            value={value.current_medications ?? ""} onChange={(e) => onChange({ ...value, current_medications: e.target.value || undefined })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Scenario types + data ────────────────────────────────────────────────────

interface Scenario {
  persona: string;
  wearable: string;
  sessionId: string;
  protocol: ProtocolOutput;
  rules: RulesSummary;
  telemetry: TelemetryDisplay;
  tensions: Tension[];
}

const SCENARIOS: Record<ScenarioKey, Scenario> = {

  METABOLIC: {
    persona: "Marcus · Body Comp",
    wearable: "Dexcom CGM + Oura",
    sessionId: "AUR-7X42-M91K",
    rules: {
      template: "METABOLIC",
      triggers: ["glucose_variability_high", "body_comp_goal", "glp1_recently_stopped"],
      contraindications: [],
      doseCeilings: { Semaglutide: 2.0, "AOD-9604": 500 },
    },
    telemetry: {
      hrvAvg: "28ms ▼8", hrvTrend: "down",
      rhr: "62 bpm",
      sleepAvg: "6h 14m ▼22m", sleepTrend: "down",
      sleepEff: "74%", remRatio: "18%", deepSleep: "12%",
      recovery: "42% ▼11", recoveryTrend: "down",
      strain: "8.4 avg",
      respRate: "16.2 rpm",
      spo2: "97.1%",
      cgmMean: "107 mg/dL",
      goal: "body_comp",
      hrvSparkPath: "M0,14 L12,12 L24,10 L36,14 L48,16 L60,13 L72,11 L84,15 L96,18 L100,16",
      recoverySparkPath: "M0,8 L12,10 L24,12 L36,14 L48,13 L60,15 L72,14 L84,16 L96,17 L100,18",
    },
    tensions: [
      {
        id: "metabolic_rebound",
        severity: "high",
        drivers: ["post_intervention_window", "weight_rising", "glucose_variability_38pct", "glp1_recently_stopped"],
        implication: "Post-GLP-1 metabolic window is active; prioritize lean-mass preservation and glycemic stability before rebound sets in.",
      },
      {
        id: "overreaching",
        severity: "elevated",
        drivers: ["hrv_down_7d", "recovery_low", "sleep_fragmented"],
        implication: "Recovery capacity is lagging training load; favour restoration over stimulus this week.",
      },
    ],
    protocol: {
      template: "METABOLIC",
      headline: "Metabolic & Body Composition Stack — GLP-1 support + lipolysis targeting",
      steps: [
        {
          compound: "Semaglutide",
          dose: "1.0 mg/week subcutaneous (maintenance target)",
          timing: "Once weekly, same day each week (Sunday AM recommended)",
          rationale: "Your 7-day glucose average of 107 mg/dL and 38% variability index indicate impaired fasting glucose. GLP-1 receptor activation improves insulin sensitivity and reduces appetite drive — both mechanistically aligned with your biometric pattern.",
          resonance: 0.91,
          resonanceReason: "glucose mean 107 + variability 38 + primary_goal=body_comp",
          titration: [
            { phase: "Week 1–2", dose: "0.25 mg/wk", duration: "2 weeks" },
            { phase: "Week 3–4", dose: "0.5 mg/wk", duration: "2 weeks" },
            { phase: "Week 5+",  dose: "1.0 mg/wk", duration: "ongoing" },
          ],
        },
        {
          compound: "AOD-9604",
          dose: "300 mcg/day subcutaneous",
          timing: "Fasted AM injection, at least 30 min before first meal",
          rationale: "GH-derived fragment targeting adipocyte lipolysis without elevating IGF-1. Complements the GLP-1 satiety mechanism by accelerating fat oxidation during the fasted window your data shows.",
          resonance: 0.68,
          resonanceReason: "adjunct lipolysis · supports goal but no direct biometric driver",
          titration: null,
        },
      ],
      lifestyle: [
        "Protein target: 1.8–2.0 g/kg bodyweight/day to preserve lean mass during caloric restriction",
        "Resistance training minimum 3×/week — essential to prevent muscle-sparing loss on GLP-1 protocol",
        "Monitor fasting glucose weekly; target trend below 100 mg/dL within 6 weeks",
        "Caloric deficit of 300–400 kcal/day — modest deficit prevents metabolic adaptation",
      ],
      cycle: "Semaglutide: continuous titration under clinical guidance. AOD-9604: 4 weeks on, 2 weeks off, re-assess on biometrics.",
      caveats: [
        "Semaglutide is a prescription-grade GLP-1 agonist. Educational only — obtain via licensed clinician.",
        "Do NOT combine with other GLP-1 medications (Ozempic, Mounjaro, Victoza).",
        "Common side effects: nausea, injection-site reactions. Titrate slowly to minimise.",
        "Stop and consult a clinician if you experience persistent vomiting, severe abdominal pain, or visual changes.",
      ],
      protein: [
        { name: "Whey Isolate", dose: "30–40g post-workout", rationale: "Fast-absorbing complete protein; critical on GLP-1 to preserve lean mass while appetite is suppressed.", affiliateSlot: null },
        { name: "Casein Protein", dose: "30g before bed", rationale: "Slow-digesting; maintains positive nitrogen balance overnight when anabolic window is longest.", affiliateSlot: null },
      ],
      vitamins: [
        { name: "Vitamin D3 + K2", dose: "5,000 IU D3 / 100 mcg K2 daily", rationale: "D3 improves insulin receptor sensitivity — directly supports the metabolic protocol goal.", affiliateSlot: null },
        { name: "Magnesium Glycinate", dose: "400 mg before bed", rationale: "Magnesium depletion is common in insulin-resistant states. Glycinate form improves sleep quality and reduces cortisol.", affiliateSlot: null },
        { name: "Berberine", dose: "500 mg with meals, 2×/day", rationale: "AMPK activator with glucose-lowering effect comparable to metformin in several trials. Synergistic with GLP-1 pathway.", affiliateSlot: null },
        { name: "Omega-3 (EPA/DHA)", dose: "2–3g EPA+DHA daily", rationale: "Anti-inflammatory; improves adiponectin levels and insulin receptor sensitivity.", affiliateSlot: null },
      ],
      foods: [
        { name: "Wild Salmon / Sardines", frequency: "3–4×/week", rationale: "Highest EPA/DHA density in whole-food form; also provides complete protein and vitamin D." },
        { name: "Leafy Greens (spinach, arugula)", frequency: "Daily (2 cups minimum)", rationale: "Fibre slows glucose absorption — directly addresses your 38% glucose variability reading." },
        { name: "Eggs", frequency: "Daily (3–4 eggs)", rationale: "Choline, protein, and fat-soluble vitamins. Satiating during GLP-1 titration phase." },
        { name: "Blueberries", frequency: "1 cup daily", rationale: "Low glycemic index; polyphenols improve insulin sensitivity and reduce oxidative stress." },
      ],
    },
  },

  RECOVERY: {
    persona: "Alex · Athlete",
    wearable: "WHOOP",
    sessionId: "AUR-3K88-R24W",
    rules: {
      template: "RECOVERY",
      triggers: ["recovery_chronically_low", "hrv_chronically_low", "strain_load_high"],
      contraindications: [],
      doseCeilings: { "BPC-157": 500, "TB-500": 5 },
    },
    telemetry: {
      hrvAvg: "38ms ▼19", hrvTrend: "down",
      rhr: "58 bpm",
      sleepAvg: "7h 02m ▼14m", sleepTrend: "down",
      sleepEff: "81%", remRatio: "22%", deepSleep: "17%",
      recovery: "31% ▼24", recoveryTrend: "down",
      strain: "15.7 avg",
      respRate: "14.8 rpm",
      spo2: "98.2%",
      cgmMean: "—",
      goal: "recovery",
      hrvSparkPath: "M0,6 L10,8 L20,5 L30,10 L40,12 L50,9 L60,14 L70,16 L80,13 L90,18 L100,19",
      recoverySparkPath: "M0,4 L10,6 L20,8 L30,10 L40,12 L50,14 L60,16 L70,17 L80,18 L90,19 L100,20",
    },
    tensions: [
      {
        id: "overreaching",
        severity: "high",
        drivers: ["strain_15_7_avg", "recovery_31pct", "hrv_down_19ms_7d", "rhr_up_7d"],
        implication: "Training load is exceeding recovery capacity — this is the definition of overreaching. Favour deload this week; adding stimulus will extend the deficit.",
      },
      {
        id: "hormonal_shift",
        severity: "watch",
        drivers: ["cortisol_pattern_elevated", "hrv_suppressed_14d", "sleep_quality_declining"],
        implication: "Sustained high cortisol from overtraining is blunting HRV and disrupting sleep architecture; recovery peptide support is mechanistically appropriate here.",
      },
    ],
    protocol: {
      template: "RECOVERY",
      headline: "Recovery & Repair Stack — BPC-157 priority with TB-500 loading phase",
      steps: [
        {
          compound: "BPC-157",
          dose: "250–500 mcg/day subcutaneous (split AM/PM)",
          timing: "30 min pre-workout or immediately post-soft-tissue insult",
          rationale: "Your 14-day WHOOP data shows a 24-point recovery crash driven by high strain (15.7 avg) without adequate adaptation. BPC-157 supports the angiogenic and anti-inflammatory signalling needed to rebuild soft-tissue resilience during enforced deload.",
          resonance: 0.88,
          resonanceReason: "recovery_31 + hrv_down_19ms + strain_15.7 avg",
          titration: null,
        },
        {
          compound: "TB-500",
          dose: "2.5–5 mg/week subcutaneous, split 2 doses",
          timing: "Loading phase weeks 1–4; taper at week 5",
          rationale: "Systemic recovery support across multiple tissue types — complements BPC-157 for acute multi-site musculoskeletal stress. Loading phase aligns with your overreaching window.",
          resonance: 0.73,
          resonanceReason: "adjunct systemic repair · acute overreaching confirmed",
          titration: [
            { phase: "Week 1–4", dose: "5 mg/wk split Mon/Thu", duration: "Loading" },
            { phase: "Week 5–8", dose: "2.5 mg/wk", duration: "Maintenance" },
          ],
        },
      ],
      lifestyle: [
        "Sleep target: 8h+ for 14 nights — WHOOP sleep coaching mode recommended",
        "Cap zone-5 work at 0–1 sessions/week for this cycle; zone-2 volume only",
        "Protein floor: 1.6 g/kg bodyweight/day to support tissue repair signalling",
        "Cold contrast therapy (2 min cold / 2 min hot × 3 rounds) daily if available",
      ],
      cycle: "BPC-157: 4 weeks on, 2 weeks off, re-assess on WHOOP recovery trend. TB-500: loading phase weeks 1–4 only.",
      caveats: [
        "Stop and consult a clinician if any GI bleeding, new chest pain, or unusual swelling appears.",
        "Do not combine TB-500 with anticoagulants without clinician supervision.",
        "Re-assess training load before the next cycle — root cause resolution required.",
      ],
      protein: [
        { name: "Whey Isolate", dose: "30–40g post-workout", rationale: "Leucine-rich for muscle protein synthesis; timed post-workout to hit the anabolic window during deload.", affiliateSlot: null },
        { name: "Collagen Peptides", dose: "15g with vitamin C, morning", rationale: "Collagen synthesis peaks with vitamin C co-ingestion. Directly supports tendon and ligament remodelling alongside BPC-157.", affiliateSlot: null },
      ],
      vitamins: [
        { name: "Zinc + Copper (15mg/2mg)", dose: "15 mg zinc / 2 mg copper nightly", rationale: "Zinc is depleted by high training load and directly supports tissue-repair enzyme function.", affiliateSlot: null },
        { name: "Vitamin C", dose: "500–1,000 mg with collagen dose", rationale: "Required co-factor for collagen hydroxylation — without it, collagen supplements have reduced efficacy.", affiliateSlot: null },
        { name: "Magnesium Glycinate", dose: "400 mg before bed", rationale: "Blunts cortisol-driven sleep disruption; supports muscle relaxation and deep sleep onset.", affiliateSlot: null },
      ],
      foods: [
        { name: "Bone Broth", frequency: "1–2 cups daily", rationale: "Natural source of collagen precursors, glycine, and proline — complements TB-500 systemic repair signalling." },
        { name: "Wild Salmon", frequency: "4×/week", rationale: "EPA/DHA load reduces inflammatory burden; astaxanthin content supports muscle recovery." },
        { name: "Tart Cherry Juice", frequency: "8–12 oz nightly", rationale: "Melatonin precursors + anthocyanins — research-backed for reducing post-exercise DOMS and improving sleep onset." },
        { name: "Sweet Potato", frequency: "Post-workout", rationale: "High-glycemic carb window post-training replenishes glycogen; potassium supports electrolyte balance." },
      ],
    },
  },

  GH: {
    persona: "Jordan · Performance",
    wearable: "Oura Ring",
    sessionId: "AUR-9P21-G77J",
    rules: {
      template: "GH",
      triggers: ["sleep_chronically_short", "deep_sleep_deficient", "rem_deficient"],
      contraindications: [],
      doseCeilings: { "CJC-1295": 100, Ipamorelin: 300 },
    },
    telemetry: {
      hrvAvg: "51ms ▼4", hrvTrend: "neutral",
      rhr: "55 bpm",
      sleepAvg: "5h 42m ▼31m", sleepTrend: "down",
      sleepEff: "72%", remRatio: "14%", deepSleep: "9%",
      recovery: "58% ▼6", recoveryTrend: "down",
      strain: "9.2 avg",
      respRate: "15.4 rpm",
      spo2: "96.8%",
      cgmMean: "—",
      goal: "performance",
      hrvSparkPath: "M0,9 L15,10 L30,11 L45,10 L60,12 L75,11 L90,12 L100,13",
      recoverySparkPath: "M0,9 L15,9 L30,10 L45,11 L60,10 L75,12 L90,13 L100,14",
    },
    tensions: [
      {
        id: "hormonal_shift",
        severity: "watch",
        drivers: ["deep_sleep_9pct", "rem_14pct", "gh_pulse_suppressed", "sleep_latency_elevated"],
        implication: "GH secretion is tightly coupled to slow-wave sleep — at 9% deep sleep, the overnight GH pulse is blunted. This directly limits adaptation and recovery between sessions.",
      },
    ],
    protocol: {
      template: "GH",
      headline: "GH Optimisation Stack — CJC-1295 + Ipamorelin for sleep-phase pulse restoration",
      steps: [
        {
          compound: "CJC-1295 (no-DAC)",
          dose: "100 mcg subcutaneous",
          timing: "Bedtime, on empty stomach (last meal ≥ 2h prior)",
          rationale: "Your Oura data shows 9% deep sleep (vs. 20–25% healthy range) and 14% REM over 14 days. CJC-1295 (no-DAC) aligns the GHRH pulse with the natural slow-wave sleep window — restoring GH secretion without the prolonged half-life of DAC variants.",
          resonance: 0.82,
          resonanceReason: "deep_sleep 9% + rem 14% + sleep_avg 5h42m",
          titration: [
            { phase: "Week 1–2", dose: "50 mcg/night", duration: "Assess tolerance" },
            { phase: "Week 3+",   dose: "100 mcg/night", duration: "Maintenance" },
          ],
        },
        {
          compound: "Ipamorelin",
          dose: "200–300 mcg subcutaneous",
          timing: "Bedtime, paired with CJC-1295 dose",
          rationale: "Selective GHRP that does not raise cortisol or prolactin — important distinction from GHRP-2/6. Synergises with CJC to amplify the pulsatile GH release without blunting the natural axis.",
          resonance: 0.79,
          resonanceReason: "selective GH secretagogue · no cortisol elevation · stacks cleanly with CJC",
          titration: null,
        },
      ],
      lifestyle: [
        "Last meal ≥ 2 hours before bedtime injection — insulin suppresses GH release",
        "Fixed wake time, 7 days/week — Oura circadian data shows irregular wake destroying sleep architecture",
        "Alcohol < 2 drinks/week during the cycle — inhibits GH release and suppresses SWS",
        "Track AM fasted glucose weekly; any drift > 10 mg/dL above baseline warrants dosage review",
      ],
      cycle: "5 days on, 2 days off (weekend washout). 8–12 weeks, then re-assess Oura deep-sleep trend before repeating.",
      caveats: [
        "Watch for fasting glucose drift > 10 mg/dL above baseline — GH secretagogues can blunt insulin sensitivity.",
        "Pause and consult a clinician if persistent edema, joint pain, carpal tunnel symptoms, or numbness develops.",
        "IGF-1 should be tested at baseline and at week 8 if clinical access is available.",
      ],
      protein: [
        { name: "Whey Isolate", dose: "30–40g post-workout (not within 2h of bedtime injection)", rationale: "Complete amino acid profile for muscle protein synthesis; timing avoids the insulin spike that suppresses GH at injection time.", affiliateSlot: null },
        { name: "Casein Protein", dose: "20g — 3h before bed if needed", rationale: "Slow-release amino delivery overnight without spiking insulin in the injection window.", affiliateSlot: null },
      ],
      vitamins: [
        { name: "Vitamin D3 + K2", dose: "5,000 IU D3 / 100 mcg K2 daily (morning)", rationale: "D3 deficiency reduces GH receptor sensitivity. Oura recovery data is consistent with sub-optimal D3 status.", affiliateSlot: null },
        { name: "Zinc (15mg)", dose: "15 mg nightly", rationale: "Zinc is a co-factor for GH secretion; supplementation in deficient states directly improves GH pulsatility.", affiliateSlot: null },
        { name: "Melatonin (low-dose)", dose: "0.3–0.5 mg, 30 min before bed", rationale: "Low-dose melatonin improves sleep onset latency; supports the circadian alignment that amplifies GH release.", affiliateSlot: null },
      ],
      foods: [
        { name: "Eggs (whole)", frequency: "Daily (3–5 eggs)", rationale: "Choline and complete amino acids; egg yolk zinc supports GH co-factor pathways." },
        { name: "Kiwi", frequency: "2 kiwis nightly, 1h before bed", rationale: "RCT-supported for reducing sleep latency and increasing SWS duration via serotonin precursor pathway." },
        { name: "Almonds / Pumpkin Seeds", frequency: "Handful, evening snack (early)", rationale: "Magnesium and tryptophan content supports sleep architecture. Keep timing ≥ 2h before injection." },
        { name: "Turkey / Chicken Breast", frequency: "4–5×/week, dinner", rationale: "High tryptophan-to-leucine ratio — sleep quality correlates with dietary tryptophan in performance athletes." },
      ],
    },
  },

  SLEEP_STRESS: {
    persona: "Sarah · Perimenopause",
    wearable: "Garmin",
    sessionId: "AUR-2L55-S38F",
    rules: {
      template: "SLEEP_STRESS",
      triggers: ["sleep_chronically_short", "hrv_chronically_low", "menopause_peri"],
      contraindications: [],
      doseCeilings: { DSIP: 0.3, Selank: 1.5 },
    },
    telemetry: {
      hrvAvg: "22ms ▼11", hrvTrend: "down",
      rhr: "68 bpm",
      sleepAvg: "5h 51m ▼38m", sleepTrend: "down",
      sleepEff: "67%", remRatio: "19%", deepSleep: "8%",
      recovery: "38% ▼14", recoveryTrend: "down",
      strain: "5.1 avg",
      respRate: "16.8 rpm",
      spo2: "97.4%",
      cgmMean: "—",
      goal: "sleep_stress",
      hrvSparkPath: "M0,10 L10,15 L20,8 L30,16 L40,10 L50,18 L60,12 L70,19 L80,14 L90,18 L100,17",
      recoverySparkPath: "M0,8 L10,11 L20,9 L30,13 L40,11 L50,15 L60,13 L70,17 L80,14 L90,18 L100,17",
    },
    tensions: [
      {
        id: "hormonal_shift",
        severity: "high",
        drivers: ["menopause_peri_reported", "hrv_22ms", "sleep_eff_67pct", "deep_sleep_8pct", "rhr_elevated_68"],
        implication: "Perimenopausal hormonal fluctuation is the primary driver — oestrogen withdrawal disrupts GABA signalling, blunts HRV, and fragments sleep architecture. Protocol addresses the neurochemical layer first.",
      },
      {
        id: "overreaching",
        severity: "watch",
        drivers: ["hrv_highly_variable", "cortisol_pattern_elevated", "recovery_38pct"],
        implication: "HRV volatility signals HPA axis dysregulation from chronic stress load — even at low training strain (5.1). Reducing neurological stress burden is as important as sleep hygiene.",
      },
    ],
    protocol: {
      template: "SLEEP_STRESS",
      headline: "Sleep & Stress Resilience — DSIP + Selank with circadian anchoring",
      steps: [
        {
          compound: "DSIP",
          dose: "100–300 mcg subcutaneous",
          timing: "30 min before bed, 3–4 nights/week (not consecutive every night)",
          rationale: "Your Garmin 14-day data shows 67% sleep efficiency and 8% deep sleep — both severely blunted. DSIP (Delta Sleep-Inducing Peptide) directly modulates the neurochemical cascade for slow-wave sleep entry. Perimenopausal GABA dysregulation makes this mechanistically relevant without the dependency risk of sedative-hypnotics.",
          resonance: 0.85,
          resonanceReason: "sleep_eff 67% + deep_sleep 8% + hrv_22ms + menopause_peri",
          titration: [
            { phase: "Week 1", dose: "100 mcg, 3 nights", duration: "Tolerance check" },
            { phase: "Week 2+", dose: "200–300 mcg, 3–4 nights/week", duration: "Ongoing" },
          ],
        },
        {
          compound: "Selank",
          dose: "250–500 mcg intranasal, 1–2×/day",
          timing: "Morning dose on waking + early afternoon if needed. Not within 6h of bed.",
          rationale: "Anxiolytic ACTH analogue without sedation or dependency. Your HRV volatility (coefficient of variation > 40% over 14d) indicates sustained HPA axis hyperactivation — Selank supports daytime composure and reduces the cortisol cycle driving your nighttime fragmentation.",
          resonance: 0.71,
          resonanceReason: "hrv_volatile + rhr_68 + cortisol_pattern + stress_recovery",
          titration: null,
        },
      ],
      lifestyle: [
        "Fixed wake time, 7 days/week — most important single input; Garmin circadian data shows 1h+ daily variance",
        "10 minutes of outdoor light within 30 min of waking — anchors cortisol AM peak and downstream melatonin timing",
        "No caffeine after 12:00 — half-life 5–6h means afternoon coffee persists at 25% strength at midnight",
        "Cool bedroom to 65–67°F / 18–19°C — core temperature drop is the trigger for sleep onset and deep sleep",
      ],
      cycle: "DSIP: 4 weeks on, 2 weeks off — assess Garmin sleep efficiency trend at week 4 before repeating. Selank: continuous 4–6 weeks, re-assess HRV trend.",
      caveats: [
        "Do not combine DSIP with prescription sedatives (benzodiazepines, Z-drugs) without clinician supervision.",
        "If sleep latency does not improve within 14 days, reassess circadian inputs before extending the cycle.",
        "Selank: some users experience mild fatigue on early doses — start at 250 mcg and titrate up.",
      ],
      protein: [
        { name: "Casein Protein", dose: "20g 2–3h before bed", rationale: "Slow-release amino acids overnight support recovery without spiking insulin near bedtime. Tryptophan content supports serotonin/melatonin production.", affiliateSlot: null },
        { name: "Collagen + Glycine", dose: "10–15g collagen + 3g glycine, evening", rationale: "Glycine is clinically shown to reduce core body temperature and improve subjective sleep quality — directly addresses your 67% sleep efficiency.", affiliateSlot: null },
      ],
      vitamins: [
        { name: "Magnesium Glycinate", dose: "400 mg before bed", rationale: "GABA receptor modulator — directly counteracts the GABA dysregulation driving perimenopausal sleep disruption.", affiliateSlot: null },
        { name: "Ashwagandha (KSM-66)", dose: "300 mg twice daily (morning + afternoon)", rationale: "Adaptogen shown to reduce cortisol AUC by 28% in stressed adults (RCT, n=64). Supports HPA axis regulation alongside Selank.", affiliateSlot: null },
        { name: "L-Theanine", dose: "100–200 mg, 30 min before bed", rationale: "Increases alpha brain-wave activity and GABA levels without sedation — smooth sleep onset without morning grogginess.", affiliateSlot: null },
      ],
      foods: [
        { name: "Tart Cherry (juice or concentrate)", frequency: "8 oz nightly, 1h before bed", rationale: "Naturally highest dietary melatonin source; RCTs show 84 min increase in total sleep time in older adults." },
        { name: "Pumpkin Seeds", frequency: "Small handful, evening", rationale: "High tryptophan and magnesium; tryptophan is the melatonin precursor depleted by oestrogen decline." },
        { name: "Fatty Fish (salmon, mackerel)", frequency: "3–4×/week", rationale: "EPA/DHA reduce inflammatory signalling; omega-3 supplementation improves HRV — mechanistically supported for your 22ms HRV baseline." },
        { name: "Dark Chocolate (85%+)", frequency: "1–2 squares, afternoon", rationale: "Magnesium + flavanols; theobromine is gentler than caffeine and clears by evening. Mood stabilisation during perimenopausal HPA shifts." },
      ],
    },
  },
};

// ─── Demo page ─────────────────────────────────────────────────────────────────

type Scene = "onboarding" | "terminal";

const DEFAULT_PROFILE: CollectedProfile = {};

export default function DemoPage() {
  const [scene, setScene] = useState<Scene>("onboarding");
  const [routing, setRouting] = useState<RoutingDecision>("affiliate_primary");
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("METABOLIC");
  const [demoProfile, setDemoProfile] = useState<CollectedProfile>(DEFAULT_PROFILE);

  const scenario = SCENARIOS[activeScenario];

  // Build a ProfileContext from the live profile editor
  const profileCtx = useMemo((): ProfileContext => ({
    using_peptides: demoProfile.using_peptides ?? false,
    interested_in_rx: false,
    onboarding_complete: true,
    age: demoProfile.age,
    weight_kg: demoProfile.weight_kg,
    biological_sex: demoProfile.biological_sex,
    primary_goal: demoProfile.primary_goal,
    activity_level: demoProfile.activity_level,
    menopause_status: demoProfile.menopause_status,
    glp1_status: demoProfile.glp1_status,
    glp1_stopped_month: demoProfile.glp1_stopped_month,
    current_medications: demoProfile.current_medications,
    peptides_detail: demoProfile.peptides_detail,
  }), [demoProfile]);

  // Compute live rules from current scenario biometrics + live profile
  const liveRules = useMemo(
    () => applySafetyFloor(scenario.rules.template, SCENARIO_SERIES[activeScenario], profileCtx),
    [scenario.rules.template, activeScenario, profileCtx],
  );

  // Base ceilings with no profile (reference point for the delta column)
  const baseCeilings = useMemo(
    () => applySafetyFloor(scenario.rules.template, SCENARIO_SERIES[activeScenario]).doseCeilings,
    [scenario.rules.template, activeScenario],
  );

  // What template would the engine pick for this profile + scenario biometrics?
  const suggestedTemplate = useMemo(
    () => pickTemplate(SCENARIO_SERIES[activeScenario], profileCtx),
    [activeScenario, profileCtx],
  );

  // Contraindications override routing to clinical_only — user must see a clinician.
  const effectiveRouting: RoutingDecision = liveRules.contraindications.length > 0 ? "clinical_only" : routing;

  const railGroups = useMemo(() => {
    const { protocol } = scenario;
    // Map compound display names to product catalog slugs where they differ.
    const SLUG_MAP: Record<string, string> = {
      "CJC-1295 (no-DAC)": "cjc-1295-ipamorelin",
      "Ipamorelin": "cjc-1295-ipamorelin",
    };
    // Deduplicate items sharing the same slug (CJC + Ipa → one combo entry).
    const seenSlugs = new Set<string>();
    const items: RailItem[] = [
      ...protocol.steps.flatMap((s) => {
        const slug = SLUG_MAP[s.compound] ?? s.compound.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
        if (seenSlugs.has(slug)) return [];
        seenSlugs.add(slug);
        return [{ slug, name: s.compound, dose: s.dose, category: "Peptides" }];
      }),
      ...(protocol.vitamins ?? []).map((v) => ({
        slug: `slot-vitamin-${v.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: v.name,
        dose: v.dose,
        category: "Vitamins",
      })),
      ...(protocol.protein ?? []).map((p) => ({
        slug: `slot-protein-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: p.name,
        dose: p.dose,
        category: "Protein",
      })),
    ];
    return routeByVendor(items, products);
  }, [scenario]);

  return (
    <div className="pharmacopoeia min-h-screen">
      {/* Demo Control Bar */}
      <div className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[color:var(--paper-deep)]/90 backdrop-blur px-6 py-3">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="p-cat-label font-mono shrink-0">
            ▸ Demo Mode
          </span>

          <div className="flex gap-1">
            {(["onboarding", "terminal"] as Scene[]).map((s) => (
              <button
                key={s}
                onClick={() => setScene(s)}
                className={`rounded px-3 py-1 text-xs font-medium transition ${scene === s ? "bg-[color:var(--ink)] text-[color:var(--paper)]" : "text-[color:var(--ink-faint)] hover:text-[color:var(--ink)]"}`}
              >
                {s === "terminal" ? "Protocol Terminal" : "Onboarding Wizard"}
              </button>
            ))}
          </div>

          {scene === "terminal" && (
            <>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-[color:var(--ink-faint)] shrink-0">Scenario:</span>
                {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveScenario(key)}
                    className={`rounded px-3 py-1 text-xs font-medium transition ${activeScenario === key ? "bg-[color:var(--sig-alert-tint)] text-[color:var(--specimen)] border border-[color:var(--specimen)]" : "text-[color:var(--ink-faint)] hover:text-[color:var(--ink)]"}`}
                  >
                    {SCENARIOS[key].persona}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-[color:var(--ink-faint)]">Source:</span>
                <span className="text-xs font-mono text-[color:var(--sig-ok)] bg-[color:var(--sig-ok-tint)] border border-[color:var(--sig-ok)] px-2 py-0.5 rounded">
                  {scenario.wearable} · via Terra
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-[color:var(--ink-faint)] shrink-0">Routing:</span>
                {(["affiliate_primary", "clinical_primary", "clinical_only"] as RoutingDecision[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRouting(r)}
                    className={`rounded px-2 py-1 text-xs font-mono transition ${routing === r ? "bg-[color:var(--ink)] text-[color:var(--paper)]" : "text-[color:var(--ink-faint)] hover:text-[color:var(--ink)]"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {scene === "onboarding" && (
          <div className="mx-auto max-w-lg">
            <p className="p-cat-label mb-2">Biosignature Setup</p>
            <h1 className="mb-2 p-serif text-3xl">Tell us about yourself</h1>
            <p className="mb-8 text-[color:var(--ink-soft)] text-sm">Takes 2 minutes. Used only to personalise your protocol — never shared.</p>
            <DemoIntakeForm
              onComplete={(profile) => {
                setDemoProfile(profile);
                setScene("terminal");
              }}
            />
          </div>
        )}

        {scene === "terminal" && (
          <>
            <LiveProfileBar value={demoProfile} onChange={setDemoProfile} />
            <SafetyFloorPanel
              rules={liveRules}
              baseCeilings={baseCeilings}
              suggestedTemplate={suggestedTemplate}
            />
            <RecommendationCard
              id={`demo-${activeScenario.toLowerCase()}`}
              output={scenario.protocol}
              rules={liveRules}
              tensions={scenario.tensions}
              routing={effectiveRouting}
              telemetry={scenario.telemetry}
              sessionId={scenario.sessionId}
              protocolAgeDays={3}
            />
            {effectiveRouting !== "clinical_only" && (
              <VendorRail
                groups={railGroups}
                templateLabel={PROTOCOL_LABELS[activeScenario]}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
