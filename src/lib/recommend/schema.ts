import { z } from "zod";
import { PROTOCOL_TEMPLATES } from "@/lib/constants";

export const RulesSummarySchema = z.object({
  template: z.enum(PROTOCOL_TEMPLATES),
  triggers: z.array(z.string()),
  contraindications: z.array(z.string()),
  doseCeilings: z.record(z.string(), z.number()),
});

export type RulesSummary = z.infer<typeof RulesSummarySchema>;

export const TitrationPhaseSchema = z.object({
  phase: z.string(),
  dose: z.string(),
  duration: z.string(),
});

export const ProtocolStepSchema = z.object({
  compound: z.string(),
  dose: z.string(),
  timing: z.string(),
  rationale: z.string(),
  resonance: z.number().min(0).max(1),
  resonanceReason: z.string().max(120),
  titration: z.array(TitrationPhaseSchema).min(1).max(8).nullable().optional(),
});

export const NutritionItemSchema = z.object({
  name: z.string(),
  dose: z.string(),
  rationale: z.string(),
  affiliateSlot: z.string().nullable(),
});

export const FoodItemSchema = z.object({
  name: z.string(),
  frequency: z.string(),
  rationale: z.string(),
});

export const ProtocolOutputSchema = z.object({
  template: z.enum(PROTOCOL_TEMPLATES),
  headline: z.string(),
  steps: z.array(ProtocolStepSchema).min(1).max(6),
  lifestyle: z.array(z.string()).max(6),
  cycle: z.string(),
  caveats: z.array(z.string()).min(1),
  protein: z.array(NutritionItemSchema).optional(),
  vitamins: z.array(NutritionItemSchema).optional(),
  foods: z.array(FoodItemSchema).optional(),
});

export type NutritionItem = z.infer<typeof NutritionItemSchema>;
export type FoodItem = z.infer<typeof FoodItemSchema>;
export type TitrationPhase = z.infer<typeof TitrationPhaseSchema>;
export type ProtocolStep = z.infer<typeof ProtocolStepSchema>;
export type ProtocolOutput = z.infer<typeof ProtocolOutputSchema>;

export const TrendDirectionSchema = z.enum(["up", "down", "flat"]);

export const TrendMetricSchema = z.object({
  current: z.number().nullable(),
  mean7d: z.number().nullable(),
  delta7d: z.number().nullable(),
  direction: TrendDirectionSchema,
});

export const BiometricTrendsSchema = z.object({
  hrv: TrendMetricSchema,
  rhr: TrendMetricSchema,
  sleep: TrendMetricSchema,
  recovery: TrendMetricSchema,
  glucose: TrendMetricSchema.optional(),
});

export type TrendDirection = z.infer<typeof TrendDirectionSchema>;
export type TrendMetric = z.infer<typeof TrendMetricSchema>;
export type BiometricTrends = z.infer<typeof BiometricTrendsSchema>;
