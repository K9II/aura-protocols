import { describe, it, expect } from "vitest";
import { LEAD_MAGNET_TEMPLATES, getLeadMagnetTemplate } from "@/lib/leadMagnetEmails";

const RECIPIENT = "reader@example.com";

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

  it("every template has a subject, the compliance disclaimer, and a one-click unsubscribe link", () => {
    for (const goal of Object.keys(LEAD_MAGNET_TEMPLATES)) {
      const template = getLeadMagnetTemplate(
        goal as keyof typeof LEAD_MAGNET_TEMPLATES,
        RECIPIENT
      );
      expect(template.subject.length).toBeGreaterThan(0);
      expect(template.html).toContain("research use only");
      expect(template.html).toContain("consult a physician");
      // CAN-SPAM / SES best practice: every email must carry a working unsubscribe link.
      expect(template.html).toContain(
        "https://shop.auraprotocols.com/api/unsubscribe?email=reader%40example.com"
      );
      expect(template.html.toLowerCase()).toContain("unsubscribe");
    }
  });

  it("url-encodes the recipient email in the unsubscribe link", () => {
    const template = getLeadMagnetTemplate("Weight Loss", "a+b@example.com");
    expect(template.html).toContain(
      "https://shop.auraprotocols.com/api/unsubscribe?email=a%2Bb%40example.com"
    );
  });

  it("getLeadMagnetTemplate returns the Weight Loss template with real product links", () => {
    const template = getLeadMagnetTemplate("Weight Loss", RECIPIENT);
    expect(template.subject).toBe("Your weight-loss starting protocol — 3 compounds, real doses");
    expect(template.html).toContain("https://shop.auraprotocols.com/products/semaglutide");
    expect(template.html).toContain("https://shop.auraprotocols.com/products/retatrutide");
    expect(template.html).toContain("https://shop.auraprotocols.com/products/aod-9604");
  });
});
