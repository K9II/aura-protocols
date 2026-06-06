import "server-only";
import { applySafetyFloor, pickTemplate } from "@/lib/recommend/rules";
import { personalizeProtocol } from "@/lib/recommend/llm";
import { computeTrends } from "@/lib/recommend/trends";
import { detectTensions } from "@/lib/recommend/tension";
import type { BiometricSnapshot } from "@/lib/terra/schema";
import type { BiometricTrends, ProtocolOutput, RulesSummary, Tension } from "@/lib/recommend/schema";
import type { ProfileContext } from "@/lib/profile/schema";

export interface RecommendResult {
  rules: RulesSummary;
  trends: BiometricTrends;
  tensions: Tension[];
  output: ProtocolOutput;
}

export async function recommend(
  series: BiometricSnapshot[],
  profile: ProfileContext | null = null,
): Promise<RecommendResult> {
  const template = pickTemplate(series, profile);
  const rules = applySafetyFloor(template, series, profile);
  const trends = computeTrends(series);
  const tensions = detectTensions(series, trends, profile);
  const output = await personalizeProtocol({ template, rules, series, trends, tensions, profile });
  return { rules, trends, tensions, output };
}
