"use client";

import { useMemo, useState } from "react";
import RecommendationCard from "@/components/RecommendationCard";
import type { TelemetryDisplay } from "@/components/RecommendationCard";
import IntakeForm from "@/app/onboarding/IntakeForm";
import VendorRail from "@/components/VendorRail";
import type { ProtocolOutput, RulesSummary } from "@/lib/recommend/schema";
import type { RoutingDecision } from "@/components/ClinicalRouter";
import { routeByVendor, type RailItem } from "@/lib/recommend/vendor-router";
import { products } from "@/data/products";
import { PROTOCOL_LABELS } from "@/lib/constants";

const DUMMY_PROTOCOL: ProtocolOutput = {
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
    "Resistance training minimum 3x/week — essential to prevent muscle-sparing loss on GLP-1 protocol",
    "Monitor fasting glucose weekly; target trend below 100 mg/dL within 6 weeks",
    "Caloric deficit of 300–400 kcal/day — modest deficit prevents metabolic adaptation",
  ],
  cycle: "Semaglutide: continuous titration under clinical guidance. AOD-9604: 4 weeks on, 2 weeks off, re-assess on biometrics.",
  caveats: [
    "Semaglutide is a prescription-grade GLP-1 agonist. This is educational only — obtain via licensed clinician.",
    "Do NOT combine with other GLP-1 medications (Ozempic, Mounjaro, Victoza).",
    "Common side effects: nausea, injection-site reactions. Titrate slowly to minimize.",
    "Stop and consult a clinician if you experience persistent vomiting, severe abdominal pain, or visual changes.",
  ],
  protein: [
    { name: "Whey Isolate", dose: "30–40g post-workout", rationale: "Fast-absorbing complete protein; critical on GLP-1 to preserve lean mass while appetite is suppressed.", affiliateSlot: null },
    { name: "Casein Protein", dose: "30g before bed", rationale: "Slow-digesting; maintains positive nitrogen balance overnight when anabolic window is longest.", affiliateSlot: null },
  ],
  vitamins: [
    { name: "Vitamin D3 + K2", dose: "5,000 IU D3 / 100 mcg K2 daily", rationale: "Your recovery data pattern is consistent with sub-optimal D3. D3 improves insulin receptor sensitivity — directly supports the metabolic protocol goal.", affiliateSlot: null },
    { name: "Magnesium Glycinate", dose: "400 mg before bed", rationale: "Magnesium depletion is common in insulin-resistant states. Glycinate form improves sleep quality and reduces cortisol — both biomarkers showing stress in your 14-day HRV trend.", affiliateSlot: null },
    { name: "Berberine", dose: "500 mg with meals, 2x/day", rationale: "AMPK activator with glucose-lowering effect comparable to metformin in several trials. Synergistic with GLP-1 pathway — meaningful for your elevated fasting glucose.", affiliateSlot: null },
    { name: "Omega-3 (EPA/DHA)", dose: "2–3g EPA+DHA daily", rationale: "Anti-inflammatory; improves adiponectin levels and insulin receptor sensitivity. Directly supports the body composition goal.", affiliateSlot: null },
  ],
  foods: [
    { name: "Wild Salmon / Sardines", frequency: "3–4x/week", rationale: "Highest EPA/DHA density in whole-food form; also provides complete protein and vitamin D. Supports inflammatory load reduction aligned with your biometrics." },
    { name: "Leafy Greens (spinach, arugula, kale)", frequency: "Daily (2 cups minimum)", rationale: "Magnesium, folate, and fiber density. Fiber slows glucose absorption — directly addresses your 38% glucose variability reading." },
    { name: "Eggs", frequency: "Daily (3–4 eggs)", rationale: "Choline, protein, and fat-soluble vitamins. Satiating during GLP-1 titration phase when appetite patterns are unstable." },
    { name: "Blueberries", frequency: "1 cup daily, preferably with meals", rationale: "Low glycemic index; polyphenols improve insulin sensitivity. Dense antioxidant profile reduces oxidative stress markers common in metabolic syndrome patterns." },
    { name: "Olive Oil (extra virgin)", frequency: "2–3 tbsp daily (cooking/dressing)", rationale: "Oleocanthal reduces systemic inflammation; oleic acid supports adiponectin expression. Mediterranean-pattern diets show strongest metabolic syndrome reversal data." },
  ],
};

const DEMO_RULES: RulesSummary = {
  template: "METABOLIC",
  triggers: ["glucose_variability_high", "bmi_elevated"],
  contraindications: [],
  doseCeilings: { Semaglutide: 2, "AOD-9604": 500 },
};

const DEMO_TELEMETRY: TelemetryDisplay = {
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
};

type Scene = "onboarding" | "terminal";

export default function DemoPage() {
  const [scene, setScene] = useState<Scene>("terminal");
  const [routing, setRouting] = useState<RoutingDecision>("affiliate_primary");
  const [activeTemplate, setActiveTemplate] = useState<"METABOLIC" | "RECOVERY" | "GH">("METABOLIC");

  const recId = "demo-rec-001";
  const output: ProtocolOutput = { ...DUMMY_PROTOCOL, template: activeTemplate };
  const rules: RulesSummary = { ...DEMO_RULES, template: activeTemplate };

  const railGroups = useMemo(() => {
    const items: RailItem[] = [
      { slug: "semaglutide", name: "Semaglutide", dose: "1.0 mg/week", category: "Weight Management" },
      { slug: "aod-9604", name: "AOD-9604", dose: "300 mcg/day", category: "Weight Management" },
      ...(output.vitamins ?? []).map((v) => ({
        slug: `slot-vitamin-${v.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: v.name,
        dose: v.dose,
        category: "Vitamins",
      })),
      ...(output.protein ?? []).map((p) => ({
        slug: `slot-protein-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: p.name,
        dose: p.dose,
        category: "Protein",
      })),
    ];
    return routeByVendor(items, products);
  }, [output]);

  return (
    <div className="min-h-screen bg-[#04060f]">
      {/* Demo Control Bar */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0d1117]/90 backdrop-blur px-6 py-3">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-4">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Demo Mode</span>
          <div className="flex gap-1">
            {(["terminal", "onboarding"] as Scene[]).map((s) => (
              <button key={s} onClick={() => setScene(s)}
                className={`rounded px-3 py-1 text-xs font-medium transition ${scene === s ? "bg-white/15 text-white" : "text-slate-500 hover:text-white"}`}>
                {s === "terminal" ? "Protocol Terminal" : "Onboarding Wizard"}
              </button>
            ))}
          </div>
          {scene === "terminal" && (
            <>
              <div className="flex gap-1">
                <span className="text-xs text-slate-500 self-center">Routing:</span>
                {(["affiliate_primary", "clinical_primary", "clinical_only"] as RoutingDecision[]).map((r) => (
                  <button key={r} onClick={() => setRouting(r)}
                    className={`rounded px-2 py-1 text-xs font-mono transition ${routing === r ? "bg-white/15 text-white" : "text-slate-500 hover:text-white"}`}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <span className="text-xs text-slate-500 self-center">Template:</span>
                {(["METABOLIC", "RECOVERY", "GH"] as const).map((t) => (
                  <button key={t} onClick={() => setActiveTemplate(t)}
                    className={`rounded px-2 py-1 text-xs font-mono transition ${activeTemplate === t ? "bg-cyan-500/20 text-cyan-300" : "text-slate-500 hover:text-white"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {scene === "onboarding" && (
          <div className="mx-auto max-w-lg">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">Biosignature Setup</p>
            <h1 className="mb-2 font-display text-3xl font-bold text-white">Tell us about yourself</h1>
            <p className="mb-8 text-slate-400 text-sm">Takes 2 minutes. Used only to personalize your protocol — never shared.</p>
            <IntakeForm />
          </div>
        )}

        {scene === "terminal" && (
          <>
            <RecommendationCard
              id={recId}
              output={output}
              rules={rules}
              routing={routing}
              telemetry={DEMO_TELEMETRY}
              sessionId="AUR-7X42-M91K"
              protocolAgeDays={9}
            />
            <VendorRail
              groups={railGroups}
              templateLabel={PROTOCOL_LABELS[activeTemplate]}
            />
          </>
        )}
      </main>
    </div>
  );
}
