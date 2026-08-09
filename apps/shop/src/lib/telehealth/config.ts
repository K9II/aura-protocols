export const CATALOG_BASE = "https://www.telehealthintakeforms.com/api";
export const MEMBER_API_BASE = "https://member.leguprx.com/api/v1";

export const TELEHEALTH_CATEGORIES = [
  "weight-loss", "mens-health", "womens-health", "hair-loss", "wellness",
] as const;
export type TelehealthCategory = (typeof TELEHEALTH_CATEGORIES)[number];

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
