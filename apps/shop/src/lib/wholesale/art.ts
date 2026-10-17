import { catalogContent } from "@/data/catalog";
import { vialCap, vialLabel, vialName, vialParts } from "@/lib/catalog";
import type { KitRow, KitSheetRow } from "@/lib/wholesale/rules";

// Adds the kit picture's cap colour and vial label (an APro designation
// labels the vial; otherwise the shortened scientific name), plus the vial's
// name lines and a nicknamed blend's components so the order sheet draws the
// same vial as the Shop cards.
export function withArt(rows: KitRow[]): KitSheetRow[] {
  return rows.map((r) => {
    const name = vialName(r);
    const components = catalogContent.find((c) => c.slug === r.slug)?.components;
    return {
      ...r,
      art: { cap: vialCap(r), vialLabel: r.designation ?? vialLabel(r), vialLines: name, parts: vialParts({ designation: r.designation, components }) },
    };
  });
}
