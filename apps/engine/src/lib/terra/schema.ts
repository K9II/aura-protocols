import { z } from "zod";

export const BiometricSnapshotSchema = z.object({
  source: z.string(),
  capturedAt: z.string(),
  metricDate: z.string().nullable().optional(),
  // existing 10
  recoveryScore: z.number().min(0).max(100).nullable().optional(),
  hrvMs: z.number().min(0).nullable().optional(),
  restingHrBpm: z.number().min(20).max(200).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  deepSleepHours: z.number().min(0).max(24).nullable().optional(),
  remSleepHours: z.number().min(0).max(24).nullable().optional(),
  steps: z.number().int().min(0).nullable().optional(),
  activeCalories: z.number().min(0).nullable().optional(),
  glucoseAvgMgdl: z.number().min(20).max(600).nullable().optional(),
  glucoseVariability: z.number().min(0).nullable().optional(),
  // sleep detail
  sleepHrvRmssdMs: z.number().min(0).nullable().optional(),
  sleepHrvSdnnMs: z.number().min(0).nullable().optional(),
  sleepEfficiencyPct: z.number().min(0).max(100).nullable().optional(),
  sleepLatencyMin: z.number().min(0).nullable().optional(),
  awakeHours: z.number().min(0).max(24).nullable().optional(),
  // vitals / physiology
  respirationBpm: z.number().min(0).nullable().optional(),
  spo2Pct: z.number().min(50).max(100).nullable().optional(),
  skinTempDeltaC: z.number().min(-5).max(5).nullable().optional(),
  bodyTempC: z.number().nullable().optional(),
  systolicBp: z.number().int().nullable().optional(),
  diastolicBp: z.number().int().nullable().optional(),
  vo2max: z.number().min(0).nullable().optional(),
  // load / stress
  strain: z.number().min(0).nullable().optional(),
  stressAvg: z.number().min(0).nullable().optional(),
  workoutCount: z.number().int().min(0).nullable().optional(),
  // body composition
  weightKg: z.number().min(30).max(300).nullable().optional(),
  bodyfatPct: z.number().min(3).max(70).nullable().optional(),
  hydrationMl: z.number().int().min(0).nullable().optional(),
  // menstrual
  menstrualPhase: z.string().nullable().optional(),
  cycleDay: z.number().int().min(1).max(60).nullable().optional(),
  // hormone (fertility/cycle — menopause-wedge signals)
  lhMiuMl: z.number().min(0).nullable().optional(),
  fshMiuMl: z.number().min(0).nullable().optional(),
  e3gNgMl: z.number().min(0).nullable().optional(),
  pdgUgMl: z.number().min(0).nullable().optional(),
  // nutrition day-summary
  caloriesKcal: z.number().int().min(0).nullable().optional(),
  proteinG: z.number().min(0).nullable().optional(),
  carbsG: z.number().min(0).nullable().optional(),
  fatG: z.number().min(0).nullable().optional(),
  raw: z.unknown().optional(),
});

export type BiometricSnapshot = z.infer<typeof BiometricSnapshotSchema>;

export const TerraWebhookPayloadSchema = z.object({
  type: z.string(),
  user: z.object({
    user_id: z.string(),
    provider: z.string().optional(),
  }),
  data: z.array(z.unknown()).optional(),
});

export type TerraWebhookPayload = z.infer<typeof TerraWebhookPayloadSchema>;
