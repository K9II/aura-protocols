// The GLP-1 APro code names, stored only — no page imports this file (2026-10-10,
// until the processor clarifies; every page uses the scientific name). Kept apart
// from data/catalog.ts so the names never reach the browser. To show one, set it
// as that catalog entry's `designation`.
export const GLP_CODE_NAMES: Readonly<Record<string, string>> = {
  semaglutide: "APro-G1SM", tirzepatide: "APro-G2TRZ", retatrutide: "APro-G3RT",
  cagrilintide: "APro-CAG", cagrisema: "APro-CAGSM", "retatrutide-cagrilintide": "APro-RTCAG",
};
