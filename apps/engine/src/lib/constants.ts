export const BASE_URL = "https://engine.auraprotocols.com";
export const SHOP_URL = "https://auraprotocols.com";
export const EXTERNAL_REL = "noopener noreferrer";
export const AFFILIATE_REL = "noopener noreferrer sponsored";

export const DISCLAIMER =
  "Educational only. Not medical advice. The Engine produces protocol suggestions; medical judgment requires a licensed clinician.";

// Prescribe-grade + contraindicated demand routes to Modality (the clinical lane).
// Aura (shop + engine) is research + biometrics only — no clinician, no Rx.
// Isolated here: flip destination/label/path in one place.
export const PRESCRIBE_URL = "https://modalitybio.com";
export const PRESCRIBE_LABEL = "Get this prescribed at Modality →";

// Backend (web-API) providers only. Apple Health, Samsung Health, and Google
// Fit are mobile-SDK-only and will arrive with the native app — see
// FUTURE_WEARABLES below. Do not add them here until the mobile SDK ships.
export const SUPPORTED_WEARABLES = [
  { id: "WHOOP", label: "Whoop" },
  { id: "OURA", label: "Oura" },
  { id: "GARMIN", label: "Garmin" },
  { id: "FITBIT", label: "Fitbit" },
  { id: "DEXCOM", label: "Dexcom CGM" },
] as const;

// Mobile-SDK-only sources — surfaced as "coming soon", not yet connectable.
// Hume has no direct Terra integration; its Body Pod / Band data reaches us
// indirectly via Apple Health / Google Health Connect, read through Terra's
// mobile SDK — i.e. it arrives on the same native-app path as Apple/Samsung/Google.
export const FUTURE_WEARABLES = [
  { id: "HUME", label: "Hume" },
  { id: "APPLE", label: "Apple Health" },
  { id: "SAMSUNG", label: "Samsung Health" },
  { id: "GOOGLE", label: "Google Fit" },
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
