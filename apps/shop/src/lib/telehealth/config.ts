export const CATALOG_BASE = "https://www.telehealthintakeforms.com/api";
export const MEMBER_API_BASE = "https://member.leguprx.com/api/v1";

export const TELEHEALTH_CATEGORIES = [
  "weight-loss", "mens-health", "womens-health", "hair-loss", "wellness",
] as const;
export type TelehealthCategory = (typeof TELEHEALTH_CATEGORIES)[number];

const CATEGORY_LABELS: Record<string, string> = {
  "weight-loss": "Weight Loss",
  "mens-health": "Men's Health",
  "womens-health": "Women's Health",
  "hair-loss": "Hair Loss",
  "wellness": "Wellness",
};

/** Human label for a catalog category slug (e.g. "mens-health" -> "Men's Health"). */
export function categoryLabel(slug: string): string {
  return (
    CATEGORY_LABELS[slug] ??
    slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}

/** Aura's LegUpRx partner code. Real value set via env once the account is issued.
 *  In dev/test we fall back to the documented example id, which returns live data. */
export function getPartnerId(): string {
  const id = process.env.TELEHEALTH_PARTNER_ID;
  if (id) return id;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing TELEHEALTH_PARTNER_ID");
  }
  return "RFMLPVN1";
}
