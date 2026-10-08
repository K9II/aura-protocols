// Research verification (processor site rules): asked once, on a customer's
// first order. The field defaults to Independent Researcher (as Oath does).
// The SQL check in supabase/research-verification.sql lists the same values.
export const RESEARCH_FIELDS = [
  "independent", "pharmacology", "molecular_biology", "medicinal_chemistry",
  "biochemistry", "analytical_chemistry", "cell_biology", "other",
] as const;
export type ResearchField = (typeof RESEARCH_FIELDS)[number];

export const RESEARCH_FIELD_LABEL: Record<ResearchField, string> = {
  independent: "Independent Researcher",
  pharmacology: "Pharmacology",
  molecular_biology: "Molecular Biology",
  medicinal_chemistry: "Medicinal Chemistry",
  biochemistry: "Biochemistry",
  analytical_chemistry: "Analytical Chemistry",
  cell_biology: "Cell Biology",
  other: "Other",
};

export const DEFAULT_RESEARCH_FIELD: ResearchField = "independent";
export const RESEARCH_ORG_MAX = 120;

export type ResearchInfo = { field: ResearchField; org: string; verifiedAt: string };

export const RESEARCH_REQUIRED = "Please choose your field of research and enter your company or institution.";
export const RESEARCH_SAVE_FAILED = "We couldn't save your research details — please try again.";

export function researchLabel(field: string): string {
  return (RESEARCH_FIELD_LABEL as Record<string, string>)[field] ?? field;
}
