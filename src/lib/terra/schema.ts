import { z } from "zod";

export const BiometricSnapshotSchema = z.object({
  source: z.string(),
  capturedAt: z.string(),
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
