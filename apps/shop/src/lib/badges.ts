// Product badges rendered in the red "specimen" color (matching the Buy Now hover).
const SPECIMEN_BADGES = new Set(["Phase 3", "Top Rated", "Best Seller"]);

export function isSpecimenBadge(badge: string): boolean {
  return SPECIMEN_BADGES.has(badge);
}
