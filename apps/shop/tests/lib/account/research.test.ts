import { describe, it, expect } from "vitest";
import { RESEARCH_FIELDS, RESEARCH_FIELD_LABEL, DEFAULT_RESEARCH_FIELD, RESEARCH_ORG_MAX, researchLabel } from "@/lib/account/research";

describe("research verification fields", () => {
  it("defaults to Independent Researcher, listed first", () => {
    expect(DEFAULT_RESEARCH_FIELD).toBe("independent");
    expect(RESEARCH_FIELDS[0]).toBe("independent");
    expect(RESEARCH_FIELD_LABEL.independent).toBe("Independent Researcher");
  });

  it("has a label for every field, in the spec's order", () => {
    expect(RESEARCH_FIELDS.map((f) => RESEARCH_FIELD_LABEL[f])).toEqual([
      "Independent Researcher", "Pharmacology", "Molecular Biology", "Medicinal Chemistry",
      "Biochemistry", "Analytical Chemistry", "Cell Biology", "Other",
    ]);
  });

  it("caps the company at 120 characters and labels unknown values as-is", () => {
    expect(RESEARCH_ORG_MAX).toBe(120);
    expect(researchLabel("pharmacology")).toBe("Pharmacology");
    expect(researchLabel("mystery")).toBe("mystery");
  });
});
