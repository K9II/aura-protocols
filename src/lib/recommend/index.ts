import "server-only";
import { applySafetyFloor, pickTemplate } from "@/lib/recommend/rules";
import { personalizeProtocol } from "@/lib/recommend/llm";
import type { BiometricSnapshot } from "@/lib/terra/schema";
import type { ProtocolOutput, RulesSummary } from "@/lib/recommend/schema";

export interface RecommendResult {
  rules: RulesSummary;
  output: ProtocolOutput;
}

export async function recommend(series: BiometricSnapshot[]): Promise<RecommendResult> {
  const template = pickTemplate(series);
  const rules = applySafetyFloor(template, series);
  const output = await personalizeProtocol({ template, rules, series });
  return { rules, output };
}
