// Partner applicant types, code rules and the agreement version. Pure —
// safe on client and server. There is deliberately no "other" type, so no
// human-use roles (coaches, gyms, med spas) arrive to be declined.

export const PARTNER_TYPES = [
  { id: "academic_researcher", label: "Academic researcher", hint: "university or institute", group: "research" },
  { id: "industry_researcher", label: "Industry researcher", hint: "biotech, pharma or CRO", group: "research" },
  { id: "research_group", label: "Lab or research group", hint: "recommending for a team", group: "research" },
  { id: "clinician", label: "Clinician", hint: "MD, DO, PA or NP", group: "research" },
  { id: "pharmacist", label: "Pharmacist", hint: "incl. compounding", group: "research" },
  { id: "educator", label: "Educator", hint: "lecturer, course or journal club", group: "research" },
  { id: "publisher", label: "Publisher", hint: "blog, website or newsletter", group: "media" },
  { id: "video_creator", label: "Video creator", hint: "YouTube, TikTok", group: "media" },
  { id: "podcaster", label: "Podcaster", hint: "audio or video podcast", group: "media" },
  { id: "social_creator", label: "Social creator", hint: "Instagram, X, Threads", group: "media" },
  { id: "community_host", label: "Community host", hint: "forum, Discord, Reddit, Telegram", group: "media" },
] as const;

export type PartnerTypeId = (typeof PARTNER_TYPES)[number]["id"];
export const PARTNER_TYPE_IDS = PARTNER_TYPES.map((t) => t.id) as [PartnerTypeId, ...PartnerTypeId[]];

export const AUDIENCE_SIZES = [
  { id: "under_5k", label: "Under 5,000" },
  { id: "5k_25k", label: "5,000–25,000" },
  { id: "25k_100k", label: "25,000–100,000" },
  { id: "over_100k", label: "Over 100,000" },
] as const;
export type AudienceSizeId = (typeof AUDIENCE_SIZES)[number]["id"];
export const AUDIENCE_SIZE_IDS = AUDIENCE_SIZES.map((a) => a.id) as [AudienceSizeId, ...AudienceSizeId[]];

// "Where you publish" checkboxes; each ticked channel needs a handle or link.
// Anything else goes under "Other" as a free-text description.
export const PUBLISH_CHANNELS = [
  { id: "youtube", label: "YouTube", placeholder: "youtube.com/@yourchannel" },
  { id: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { id: "tiktok", label: "TikTok", placeholder: "@yourhandle" },
  { id: "x", label: "X (Twitter)", placeholder: "@yourhandle" },
  { id: "facebook", label: "Facebook", placeholder: "facebook.com/yourpage" },
  { id: "podcast", label: "Podcast", placeholder: "show name or link" },
] as const;
export type PublishChannelId = (typeof PUBLISH_CHANNELS)[number]["id"];

// What an applicant tells us; stored as partners.application (jsonb).
export type PartnerApplication = {
  channels: Partial<Record<PublishChannelId, string>>;
  other?: string;
  audienceSize: AudienceSizeId;
  promotion: string;
};

// Bump when the Partner Agreement text changes. Date only (no "." — mirrors TERMS_VERSION).
export const PARTNER_AGREEMENT_VERSION = "2026-10-02";

const BLOCKED = ["AURA", "FREE", "ADMIN", "STAFF", "SUPPORT", "OFFICIAL", "TEST", "DOSE", "INJECT", "CURE", "SEX", "FUCK", "SHIT", "NAZI"];

export function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export type CodeCheck = { ok: true; code: string } | { ok: false; reason: "length" | "characters" | "blocked" };

export function validateCode(raw: string): CodeCheck {
  const code = normalizeCode(raw);
  if (code.length < 3 || code.length > 20) return { ok: false, reason: "length" };
  if (!/^[A-Z0-9]+$/.test(code)) return { ok: false, reason: "characters" };
  if (BLOCKED.some((w) => code.includes(w))) return { ok: false, reason: "blocked" };
  return { ok: true, code };
}

// Codes are issued automatically: random, never derived from the partner's
// name, from characters that can't be misread (no 0/O, 1/I/L). Partners can
// change theirs later. `rand` is injectable for tests.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ISSUED_CODE_LENGTH = 8;

export function generateCode(rand: () => number = Math.random): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < ISSUED_CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
    if (validateCode(code).ok) return code;
  }
}

export const CODE_REASON_TEXT: Record<Exclude<CodeCheck, { ok: true }>["reason"] | "taken", string> = {
  length: "Use 3–20 letters or numbers.",
  characters: "Letters and numbers only.",
  blocked: "That code isn't available. Try another.",
  taken: "That code is already taken.",
};
