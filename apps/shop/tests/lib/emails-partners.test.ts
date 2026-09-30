import { describe, it, expect } from "vitest";
import {
  partnerApplicationOwnerEmail, partnerApprovedEmail, partnerDeclinedEmail, partnerCashPaidEmail,
  partnerCreditAddedEmail, ownerPayoutRunEmail, ownerW9UploadedEmail,
} from "@/lib/emails-partners";
import { findViolations } from "../../scripts/compliance-scan.mjs";

describe("partner emails", () => {
  it("approval email carries the code, the link and the disclosure rule", () => {
    const { subject, html } = partnerApprovedEmail("SMITHLAB", "https://auraprotocols.com");
    expect(subject).toBe("Your Aura partner code SMITHLAB is active");
    expect(html).toContain("https://auraprotocols.com/?ref=smithlab");
    expect(html).toContain("/partner-agreement");
    expect(html).toMatch(/#ad/);
  });

  it("owner emails name the code and escape applicant text", () => {
    expect(partnerApplicationOwnerEmail({ code: "SMITHLAB", name: "Sam <b>", typeLabel: "Academic researcher" }).html).toContain("Sam &lt;b&gt;");
    expect(ownerPayoutRunEmail("2026-10-15", [{ code: "BENCHNOTES", cashCents: 21240, hint: "ACH · checking ••••7310 · Wells Fargo" }]).subject).toBe("Payouts to send — 2026-10-15 — $212.40");
    expect(ownerW9UploadedEmail("LABRAT").subject).toBe("W-9 uploaded by LABRAT — please check it");
  });

  it("payout emails state amounts", () => {
    expect(partnerCashPaidEmail({ cashCents: 11820, reference: "4471" }).html).toContain("$118.20");
    expect(partnerCreditAddedEmail({ creditValueCents: 17730 }).html).toContain("$177.30");
  });

  it("carry no banned phrases", () => {
    const all = [
      partnerApprovedEmail("SMITHLAB", "https://auraprotocols.com"), partnerDeclinedEmail(),
      partnerApplicationOwnerEmail({ code: "X1X", name: "A", typeLabel: "Podcaster" }),
      partnerCashPaidEmail({ cashCents: 100, reference: "r" }), partnerCreditAddedEmail({ creditValueCents: 150 }),
      ownerPayoutRunEmail("2026-10-15", []), ownerW9UploadedEmail("X1X"),
    ];
    for (const { html } of all) expect(findViolations(html.replace(/<[^>]+>/g, " "))).toEqual([]);
  });
});
