"use client";

import { useState } from "react";
import type { RulesSummary } from "@/lib/recommend/schema";

interface Props {
  rules: RulesSummary;
  vendorCount: number;
  tbdCount: number;
}

export default function EngineLogDrawer({
  rules,
  vendorCount,
  tbdCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerCount = rules.triggers.length;
  const contraCount = rules.contraindications.length;
  const safetyLabel = contraCount > 0 ? "safety review" : "safety floor ok";

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
      >
        <span
          aria-hidden
          className={`text-violet-400 transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
          Engine reasoning
        </span>
        <Pill tone="violet">template={rules.template}</Pill>
        <Pill tone={contraCount > 0 ? "rose" : "emerald"}>{safetyLabel}</Pill>
        <Pill tone="slate">
          {vendorCount} {vendorCount === 1 ? "vendor" : "vendors"}
          {tbdCount > 0 ? ` · ${tbdCount} TBD` : ""}
        </Pill>
        <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {open ? "click to collapse" : "click to expand"}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/5 px-4 py-4">
          <div className="grid gap-4 text-xs text-slate-400 md:grid-cols-2">
            <Block title={`Triggers (${triggerCount})`}>
              {triggerCount === 0 ? (
                <span className="text-slate-600">none</span>
              ) : (
                <ul className="space-y-1">
                  {rules.triggers.map((t) => (
                    <li key={t} className="flex gap-2">
                      <span className="text-cyan-500">▸</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
            <Block title={`Contraindications (${contraCount})`}>
              {contraCount === 0 ? (
                <span className="text-slate-600">none</span>
              ) : (
                <ul className="space-y-1">
                  {rules.contraindications.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span className="text-rose-400">▸</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            Full step-by-step log is rendered in the terminal panel above.
          </p>
        </div>
      )}
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "violet" | "emerald" | "rose" | "slate";
  children: React.ReactNode;
}) {
  const toneClass = {
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    slate: "border-white/10 bg-white/5 text-slate-400",
  }[tone];

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      <div className="rounded-lg border border-white/5 bg-black/20 p-3">
        {children}
      </div>
    </div>
  );
}
