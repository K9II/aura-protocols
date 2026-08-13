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
    <div className="mt-6 p-card border border-[color:var(--line)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition hover:bg-[color:var(--paper-deep)]"
      >
        <span
          aria-hidden
          className={`text-[color:var(--sig-llm)] transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--sig-llm)]">
          Engine reasoning
        </span>
        <Pill tone="violet">template={rules.template}</Pill>
        <Pill tone={contraCount > 0 ? "rose" : "emerald"}>{safetyLabel}</Pill>
        <Pill tone="slate">
          {vendorCount} {vendorCount === 1 ? "vendor" : "vendors"}
          {tbdCount > 0 ? ` · ${tbdCount} TBD` : ""}
        </Pill>
        <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          {open ? "click to collapse" : "click to expand"}
        </span>
      </button>

      {open && (
        <div className="border-t border-[color:var(--line)] px-4 py-4">
          <div className="grid gap-4 text-xs text-[color:var(--ink-soft)] md:grid-cols-2">
            <Block title={`Triggers (${triggerCount})`}>
              {triggerCount === 0 ? (
                <span className="text-[color:var(--ink-faint)]">none</span>
              ) : (
                <ul className="space-y-1">
                  {rules.triggers.map((t) => (
                    <li key={t} className="flex gap-2">
                      <span className="text-[color:var(--sig-bio)]">▸</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
            <Block title={`Contraindications (${contraCount})`}>
              {contraCount === 0 ? (
                <span className="text-[color:var(--ink-faint)]">none</span>
              ) : (
                <ul className="space-y-1">
                  {rules.contraindications.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span className="text-[color:var(--sig-alert)]">▸</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          </div>
          <p className="mt-4 text-[11px] text-[color:var(--ink-faint)]">
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
    violet: "border-[color:var(--sig-llm)] bg-[color:var(--sig-llm-tint)] text-[color:var(--sig-llm)]",
    emerald: "border-[color:var(--sig-ok)] bg-[color:var(--sig-ok-tint)] text-[color:var(--sig-ok)]",
    rose: "border-[color:var(--sig-alert)] bg-[color:var(--sig-alert-tint)] text-[color:var(--sig-alert)]",
    slate: "border-[color:var(--line)] bg-[color:var(--paper-deep)] text-[color:var(--ink-soft)]",
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
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
        {title}
      </div>
      <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--paper-deep)] p-3">
        {children}
      </div>
    </div>
  );
}
