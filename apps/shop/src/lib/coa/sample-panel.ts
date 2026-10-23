// "Up to a ten-point panel" = Vanguard Elite (8 tests, incl. solubility) + the vial seal
// integrity and TFA add-ons (2026-10-22). No lot is live yet, so this is a labelled sample:
// shown on the coming-soon page and in the "A first look" email (lib/email/frame.ts).
import { PURITY_FLOOR_PCT } from "@/lib/constants";

export type SampleRow = [test: string, result: string, detail: string];
export const SAMPLE_PANEL: Array<[group: string, rows: SampleRow[]]> = [
  ["Identity & content", [
    ["Identity", "Confirmed", "spectral match"],
    ["Purity", `≥${PURITY_FLOOR_PCT}%`, "HPLC"],
    ["Quantity", "Within spec", "vs. labeled mg"],
    ["Solubility", "Soluble", ""],
  ]],
  ["Safety", [
    ["Endotoxin", "Pass", ""],
    ["Sterility", "Pass", "USP <71>, 14-day"],
    ["Heavy metals", "Pass", ""],
    ["Fentanyl", "Not detected", ""],
  ]],
  ["Vial", [
    ["Seal integrity", "Pass", ""],
    ["TFA content", "Within limit", ""],
  ]],
];
export const SAMPLE_PANEL_COUNT = SAMPLE_PANEL.reduce((n, [, rows]) => n + rows.length, 0);
