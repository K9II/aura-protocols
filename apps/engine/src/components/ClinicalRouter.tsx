"use client";

import { PRESCRIBE_URL, PRESCRIBE_LABEL, EXTERNAL_REL } from "@/lib/constants";
import type { RoutingDecision } from "@/lib/recommend/routing";

// Re-exported so existing type-only importers keep their import path. The
// routing logic itself lives in @/lib/recommend/routing (server-safe).
export type { RoutingDecision, RoutingInput } from "@/lib/recommend/routing";

interface ClinicalRouterProps {
  decision: RoutingDecision;
}

export default function ClinicalRouter({ decision }: ClinicalRouterProps) {
  if (decision === "clinical_only") {
    return (
      <div className="border border-[color:var(--sig-alert)] bg-[color:var(--sig-alert-tint)] p-6 text-center">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--sig-alert)]">Clinical Review Required</p>
        <p className="mb-4 text-sm text-[color:var(--ink-soft)]">
          A contraindication was detected in your profile. A licensed clinician should review your protocol before you proceed.
        </p>
        <a
          href={PRESCRIBE_URL}
          target="_blank"
          rel={EXTERNAL_REL}
          className="inline-block bg-[color:var(--sig-alert)] px-6 py-3 text-sm font-bold text-[color:var(--paper)] transition hover:opacity-90"
        >
          {PRESCRIBE_LABEL}
        </a>
      </div>
    );
  }

  if (decision === "clinical_primary") {
    return (
      <div className="space-y-3">
        <a
          href={PRESCRIBE_URL}
          target="_blank"
          rel={EXTERNAL_REL}
          className="block w-full bg-[color:var(--sig-llm)] px-6 py-4 text-center text-sm font-bold text-[color:var(--paper)] transition hover:opacity-90"
        >
          {PRESCRIBE_LABEL}
        </a>
        <p className="text-center text-xs text-[color:var(--ink-faint)]">
          Or{" "}
          <a href="/products" className="p-link">
            browse research-grade vendors
          </a>{" "}
          (educational use only)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <a
        href="/products"
        className="block w-full bg-[color:var(--sig-bio)] px-6 py-4 text-center text-sm font-bold text-[color:var(--paper)] transition hover:opacity-90"
      >
        Shop research-grade vendors →
      </a>
      <p className="text-center text-xs text-[color:var(--ink-faint)]">
        Want a prescription?{" "}
        <a href={PRESCRIBE_URL} target="_blank" rel={EXTERNAL_REL} className="p-link">
          Modality →
        </a>
      </p>
    </div>
  );
}
