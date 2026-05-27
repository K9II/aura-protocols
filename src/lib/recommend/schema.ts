import { z } from "zod";
import { PROTOCOL_TEMPLATES } from "@/lib/constants";

export const RulesSummarySchema = z.object({
  template: z.enum(PROTOCOL_TEMPLATES),
  triggers: z.array(z.string()),
  contraindications: z.array(z.string()),
  doseCeilings: z.record(z.string(), z.number()),
});

export type RulesSummary = z.infer<typeof RulesSummarySchema>;

export const ProtocolStepSchema = z.object({
  compound: z.string(),
  dose: z.string(),
  timing: z.string(),
  rationale: z.string(),
});

export const ProtocolOutputSchema = z.object({
  template: z.enum(PROTOCOL_TEMPLATES),
  headline: z.string(),
  steps: z.array(ProtocolStepSchema).min(1).max(6),
  lifestyle: z.array(z.string()).max(6),
  cycle: z.string(),
  caveats: z.array(z.string()).min(1),
});

export type ProtocolOutput = z.infer<typeof ProtocolOutputSchema>;
