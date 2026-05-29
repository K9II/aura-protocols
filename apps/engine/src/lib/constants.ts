export const BASE_URL = "https://auraprotocols.com";
export const SHOP_URL = "https://shop.auraprotocols.com";
export const CLINICAL_URL = "https://auraclinical.com";
export const EXTERNAL_REL = "noopener noreferrer";
export const AFFILIATE_REL = "noopener noreferrer sponsored";

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

export const PROTOCOL_TEMPLATES = ["RECOVERY", "GH", "SLEEP_STRESS", "METABOLIC"] as const;
export type ProtocolTemplateId = (typeof PROTOCOL_TEMPLATES)[number];

export const PROTOCOL_LABELS: Record<ProtocolTemplateId, string> = {
  RECOVERY: "Recovery Stack",
  GH: "Growth Hormone Stack",
  SLEEP_STRESS: "Sleep & Stress Stack",
  METABOLIC: "Metabolic & Body Composition Stack",
};

export const BUDGET_TIERS = ["50_100", "100_200", "200_plus"] as const;
export type BudgetTierId = (typeof BUDGET_TIERS)[number];

export const BUDGET_TIER_LABELS: Record<BudgetTierId, string> = {
  "50_100": "$50–$100/month",
  "100_200": "$100–$200/month",
  "200_plus": "$200+/month",
};

export const AFFILIATE_SLOTS: Record<string, string | null> = {
  protein: null,
  vitamins: null,
};

export const ANTHROPIC_MODEL = "claude-opus-4-7";
export const ANTHROPIC_MAX_TOKENS = 2500;
