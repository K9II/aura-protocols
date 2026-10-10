import { vialCap, vialLabel } from "@/lib/catalog";
import type { KitRow, KitSheetRow } from "@/lib/wholesale/rules";

// Adds the kit picture's cap colour and vial label (an APro designation
// labels the vial; otherwise the shortened scientific name).
export function withArt(rows: KitRow[]): KitSheetRow[] {
  return rows.map((r) => ({ ...r, art: { cap: vialCap(r), vialLabel: r.designation ?? vialLabel(r) } }));
}
