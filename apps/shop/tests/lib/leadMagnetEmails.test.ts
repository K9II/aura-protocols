import { describe, it, expect } from "vitest";
import { LEAD_MAGNET_TEMPLATES, getLeadMagnetTemplate } from "@/lib/leadMagnetEmails";

describe("leadMagnetEmails", () => {
  it("has exactly the 4 goal keys used by the form", () => {
    expect(Object.keys(LEAD_MAGNET_TEMPLATES).sort()).toEqual(
      [
        "Maintaining Muscle During GLP-1",
        "Muscle & Performance",
        "Sleep & Recovery",
        "Weight Loss",
      ].sort()
    );
  });

  it("every template has a non-empty subject and html containing the compliance disclaimer", () => {
    for (const goal of Object.keys(LEAD_MAGNET_TEMPLATES)) {
      const template = getLeadMagnetTemplate(goal as keyof typeof LEAD_MAGNET_TEMPLATES);
      expect(template.subject.length).toBeGreaterThan(0);
      expect(template.html).toContain("research use only");
      expect(template.html).toContain("consult a physician");
    }
  });

  it("getLeadMagnetTemplate returns the Weight Loss template with real product links", () => {
    const template = getLeadMagnetTemplate("Weight Loss");
    expect(template.subject).toBe("Your weight-loss starting protocol — 3 compounds, real doses");
    expect(template.html).toContain("https://shop.auraprotocols.com/products/semaglutide");
    expect(template.html).toContain("https://shop.auraprotocols.com/products/retatrutide");
    expect(template.html).toContain("https://shop.auraprotocols.com/products/aod-9604");
  });
});
