"use client";

import { CLINICAL_URL } from "@/lib/constants";
import type { ProfileContext } from "@/lib/profile/schema";
import type { RulesSummary } from "@/lib/recommend/schema";

export type RoutingDecision = "clinical_only" | "clinical_primary" | "affiliate_primary";

export interface RoutingInput {
  profile: ProfileContext | null;
  rules: RulesSummary;
}

export function resolveRouting(input: RoutingInput): RoutingDecision {
  if (input.rules.contraindications.length > 0) return "clinical_only";
  if (input.profile?.interested_in_rx) return "clinical_primary";
  return "affiliate_primary";
}

interface ClinicalRouterProps {
  decision: RoutingDecision;
}

export default function ClinicalRouter({ decision }: ClinicalRouterProps) {
  if (decision === "clinical_only") {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-rose-400">Clinical Review Required</p>
        <p className="mb-4 text-sm text-slate-300">
          A contraindication was detected in your profile. A licensed clinician should review your protocol before you proceed.
        </p>
        <a
          href={CLINICAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-xl bg-rose-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-rose-400"
        >
          Get this prescribed at Aura Clinical →
        </a>
      </div>
    );
  }

  if (decision === "clinical_primary") {
    return (
      <div className="space-y-3">
        <a
          href={CLINICAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl bg-violet-600 px-6 py-4 text-center text-sm font-bold text-white transition hover:bg-violet-500"
        >
          Get this prescribed at Aura Clinical →
        </a>
        <p className="text-center text-xs text-slate-500">
          Or{" "}
          <a href="/products" className="text-slate-400 underline hover:text-white">
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
        className="block w-full rounded-xl bg-cyan-500 px-6 py-4 text-center text-sm font-bold text-[#04060f] transition hover:bg-cyan-400"
      >
        Shop research-grade vendors →
      </a>
      <p className="text-center text-xs text-slate-500">
        Want a prescription?{" "}
        <a href={CLINICAL_URL} target="_blank" rel="noopener noreferrer" className="text-slate-400 underline hover:text-white">
          Aura Clinical →
        </a>
      </p>
    </div>
  );
}
