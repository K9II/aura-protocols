"use client";

import { useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";
import { ENGINE_URL, EXTERNAL_REL, ENGINE_CTA_COPY } from "@/lib/constants";

type Protocol = {
  id: string;
  label: string;
  tagline: string;
  description: string;
  accent: string;
  border: string;
  glow: string;
  tileBg: string;
  dot: string;
  slugs: string[];
  track: string[];
};

const protocols: Protocol[] = [
  {
    id: "recovery",
    label: "Recovery",
    tagline: "Tissue repair & healing",
    description:
      "Compounds studied for accelerated tissue repair, inflammation modulation, and gut health restoration. Commonly researched alongside training protocols and post-surgical recovery.",
    accent: "text-emerald-400",
    border: "border-emerald-400/40",
    glow: "shadow-[0_0_24px_rgba(52,211,153,0.15)]",
    tileBg: "bg-emerald-400/5 hover:bg-emerald-400/10",
    dot: "bg-emerald-400",
    slugs: ["bpc-157", "tb-500"],
    track: ["HRV", "Resting heart rate", "Sleep quality", "Inflammation markers"],
  },
  {
    id: "body-composition",
    label: "Body Composition",
    tagline: "Metabolic & fat loss research",
    description:
      "GLP-1 class and GH fragment compounds studied for appetite regulation, fat metabolism, and body recomposition. The most searched peptide category in 2025–2026.",
    accent: "text-rose-400",
    border: "border-rose-400/40",
    glow: "shadow-[0_0_24px_rgba(251,113,133,0.15)]",
    tileBg: "bg-rose-400/5 hover:bg-rose-400/10",
    dot: "bg-rose-400",
    slugs: ["semaglutide", "retatrutide", "aod-9604"],
    track: ["Fasting glucose", "Body weight", "Waist circumference", "DEXA body fat %"],
  },
  {
    id: "growth-performance",
    label: "Growth & Performance",
    tagline: "GH optimization & lean mass",
    description:
      "GHRH analogs and GH secretagogues studied for natural growth hormone pulse optimization, lean muscle support, and improved sleep architecture.",
    accent: "text-violet-400",
    border: "border-violet-400/40",
    glow: "shadow-[0_0_24px_rgba(167,139,250,0.15)]",
    tileBg: "bg-violet-400/5 hover:bg-violet-400/10",
    dot: "bg-violet-400",
    slugs: ["cjc-1295-ipamorelin", "sermorelin", "tesamorelin"],
    track: ["IGF-1 levels", "Sleep quality", "Lean mass", "Recovery time"],
  },
  {
    id: "longevity",
    label: "Longevity & Wellness",
    tagline: "Cellular aging & systemic health",
    description:
      "Compounds studied for telomerase activation, mitochondrial function, and systemic wellness. Emerging research area with strong interest from the longevity community.",
    accent: "text-cyan-400",
    border: "border-cyan-400/40",
    glow: "shadow-[0_0_24px_rgba(0,212,255,0.15)]",
    tileBg: "bg-cyan-400/5 hover:bg-cyan-400/10",
    dot: "bg-cyan-400",
    slugs: ["epithalon", "mots-c", "pt-141"],
    track: ["Metabolic panel", "Mitochondrial markers", "Hormonal panels", "Biological age"],
  },
];

const icons: Record<string, React.ReactNode> = {
  recovery: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  "body-composition": (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  ),
  "growth-performance": (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  longevity: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
};

export default function ProtocolSelector() {
  const [active, setActive] = useState<string>("recovery");

  const current = protocols.find((p) => p.id === active)!;
  const compounds = products.filter((p) => current.slugs.includes(p.slug));

  return (
    <div>
      {/* Protocol tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {protocols.map((p) => {
          const isActive = p.id === active;
          return (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              className={`
                relative text-left rounded-2xl border p-5 transition-all duration-300 cursor-pointer
                ${isActive
                  ? `${p.tileBg} ${p.border} ${p.glow}`
                  : "bg-white/[0.02] border-white/8 hover:border-white/20"}
              `}
            >
              <div className={`mb-3 ${isActive ? p.accent : "text-slate-500"} transition-colors duration-300`}>
                {icons[p.id]}
              </div>
              <p className={`font-display text-base font-bold mb-0.5 transition-colors duration-300 ${isActive ? "text-white" : "text-slate-400"}`}>
                {p.label}
              </p>
              <p className={`text-xs transition-colors duration-300 ${isActive ? "text-slate-400" : "text-slate-600"}`}>
                {p.tagline}
              </p>
              {isActive && (
                <span className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full ${p.dot}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Protocol detail — key forces re-mount for entrance animation */}
      <div key={active} className="animate-fade-in">
        {/* Protocol header */}
        <div className={`rounded-2xl border ${current.border} bg-white/[0.02] px-6 py-5 mb-8 flex flex-col sm:flex-row sm:items-center gap-4`}>
          <div className="flex-1">
            <p className={`text-xs uppercase tracking-widest font-semibold mb-1 ${current.accent}`}>
              {current.label} Protocol
            </p>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              {current.description}
            </p>
          </div>
          <div className="shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              {compounds.length} compound{compounds.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Compounds */}
        <div className={`grid gap-6 ${
          compounds.length === 1 ? "grid-cols-1 max-w-sm" :
          compounds.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl" :
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}>
          {compounds.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>

        {/* Step 2 — Biometrics CTA */}
        <div className="mt-10 rounded-2xl border border-white/8 bg-[#0d1117] p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">
              Step 2 — Make it yours
            </p>
            <p className="text-white font-display text-lg font-bold mb-1">
              {ENGINE_CTA_COPY.inlineHeading}
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              {ENGINE_CTA_COPY.inlineBody}
            </p>
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            <a
              href={ENGINE_URL}
              target="_blank"
              rel={EXTERNAL_REL}
              className="btn-primary text-sm text-center whitespace-nowrap"
            >
              {ENGINE_CTA_COPY.inlineAction}
            </a>
            <div className="flex items-center gap-2 justify-center">
              {current.track.slice(0, 2).map((t) => (
                <span key={t} className="text-xs text-slate-600 bg-white/[0.03] border border-white/8 px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
