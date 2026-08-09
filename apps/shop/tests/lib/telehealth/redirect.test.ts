import { describe, it, expect } from "vitest";
import { isAllowedIntakeHost } from "@/lib/telehealth/redirect";

describe("isAllowedIntakeHost", () => {
  it("allows leguprecovery.com subdomains", () => {
    expect(isAllowedIntakeHost("https://medical.leguprecovery.com/x?partner_id=A")).toBe(true);
    expect(isAllowedIntakeHost("https://meds.leguprecovery.com/y")).toBe(true);
  });
  it("allows telehealthintakeforms.com", () => {
    expect(isAllowedIntakeHost("https://www.telehealthintakeforms.com/api")).toBe(true);
  });
  it("rejects other hosts and non-https", () => {
    expect(isAllowedIntakeHost("https://evil.com/leguprecovery.com")).toBe(false);
    expect(isAllowedIntakeHost("http://medical.leguprecovery.com")).toBe(false);
    expect(isAllowedIntakeHost("not a url")).toBe(false);
  });
});
