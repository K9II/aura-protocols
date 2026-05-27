import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MAX_TOKENS, ANTHROPIC_MODEL } from "@/lib/constants";
import type { ProtocolTemplateId } from "@/lib/constants";
import { ProtocolOutputSchema } from "@/lib/recommend/schema";
import type { ProtocolOutput, RulesSummary } from "@/lib/recommend/schema";
import { TEMPLATE_SKELETONS } from "@/lib/recommend/templates";
import type { BiometricSnapshot } from "@/lib/terra/schema";

const SYSTEM_PROMPT = `You are the Aura Protocols Engine personalization layer.

You are given a deterministic safety summary (rules) and 1-14 days of biometric snapshots. You write a personalized educational protocol within the safe envelope.

CONTRACT:
- Output ONLY a JSON object. No prose, no markdown, no commentary.
- Never propose any compound, dose, or stack outside the supplied template skeleton.
- Never exceed a doseCeiling key from the rules summary.
- Never propose any protocol if the rules summary lists a contraindication; instead, set headline to a refusal explanation and leave steps as an empty-equivalent (single placeholder step explaining the contraindication) and caveats explaining why.
- Output frames suggestions as educational, never as medical advice.

OUTPUT SCHEMA (must match exactly):
{
  "template": "RECOVERY" | "GH" | "SLEEP_STRESS",
  "headline": string,
  "steps": [{ "compound": string, "dose": string, "timing": string, "rationale": string }],
  "lifestyle": string[],
  "cycle": string,
  "caveats": string[]
}

Personalize tone and rationale to the biometric signals supplied. Do not invent biometric values that were not supplied.`;

export interface PersonalizeInput {
  template: ProtocolTemplateId;
  rules: RulesSummary;
  series: BiometricSnapshot[];
}

export async function personalizeProtocol(input: PersonalizeInput): Promise<ProtocolOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userPayload = { template: input.template, rules: input.rules, skeleton: TEMPLATE_SKELETONS[input.template], series: input.series };

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: ANTHROPIC_MAX_TOKENS,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: JSON.stringify(userPayload) }],
  });

  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();

  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch {
    throw new Error("llm_parse_error: response was not valid JSON");
  }

  const result = ProtocolOutputSchema.safeParse(parsed);
  if (!result.success) throw new Error(`llm_schema_error: ${result.error.message}`);
  return result.data;
}
