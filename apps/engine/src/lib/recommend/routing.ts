import type { ProfileContext } from "@/lib/profile/schema";
import type { RulesSummary } from "@/lib/recommend/schema";

// Pure clinical-routing logic. Must live in a server-safe module (NOT a
// "use client" file) so server components like /recommendation can call it
// directly — invoking a function exported from a client module on the server
// throws at the RSC boundary (digest 1509228949).

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
