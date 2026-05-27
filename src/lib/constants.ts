export const BASE_URL = "https://auraprotocols.com";
export const SHOP_URL = "https://shop.auraprotocols.com";
export const CLINICAL_URL = "https://auraclinical.com";
export const EXTERNAL_REL = "noopener noreferrer";

export const DISCLAIMER =
  "Educational only. Not medical advice. The Engine produces protocol suggestions; medical judgment requires a licensed clinician.";

export const PRESCRIBE_CTA_COPY = "Get this prescribed at Aura Clinical →";

export const SUPPORTED_WEARABLES = [
  { id: "WHOOP", label: "Whoop" },
  { id: "OURA", label: "Oura" },
  { id: "APPLE", label: "Apple Health" },
  { id: "GARMIN", label: "Garmin" },
  { id: "FITBIT", label: "Fitbit" },
  { id: "DEXCOM", label: "Dexcom CGM" },
] as const;

export type WearableId = (typeof SUPPORTED_WEARABLES)[number]["id"];

export const PROTOCOL_TEMPLATES = ["RECOVERY", "GH", "SLEEP_STRESS"] as const;
export type ProtocolTemplateId = (typeof PROTOCOL_TEMPLATES)[number];

export const PROTOCOL_LABELS: Record<ProtocolTemplateId, string> = {
  RECOVERY: "Recovery Stack",
  GH: "Growth Hormone Stack",
  SLEEP_STRESS: "Sleep & Stress Stack",
};

export const ANTHROPIC_MODEL = "claude-opus-4-7";
export const ANTHROPIC_MAX_TOKENS = 1500;
