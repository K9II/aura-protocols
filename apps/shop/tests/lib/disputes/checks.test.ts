import { describe, it, expect } from "vitest";
import { evidenceViolations } from "@/lib/disputes/checks";
import { buildEvidence, customerStrings } from "@/lib/disputes/evidence";
import { facts } from "../../helpers/dispute-fixtures";

describe("evidence compliance check", () => {
  it("flags a banned word in our copy, by field", () => {
    const f = facts();
    expect(evidenceViolations({ ...buildEvidence(f), uncategorized_text: "The recommended dose was listed." }, customerStrings(f)))
      .toEqual({ uncategorized_text: 'Cover letter: "dose" is a banned phrase. Change the wording to save.' });
  });

  it("the customer's own name and address never trip it", () => {
    const f = facts({}, { ship: { name: "Benefit Lab", line1: "12 Treatment Plant Rd", line2: null, city: "Boulder", state: "CO", zip: "80302" } });
    const e = buildEvidence(f);
    expect(e.uncategorized_text).toContain("12 Treatment Plant Rd");
    expect(evidenceViolations(e, customerStrings(f))).toEqual({});
  });

  it("built evidence is clean", () => {
    const f = facts();
    expect(evidenceViolations(buildEvidence(f), customerStrings(f))).toEqual({});
  });
});
