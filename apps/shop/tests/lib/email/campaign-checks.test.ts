import { describe, it, expect } from "vitest";
import { campaignChecks, isBlocked } from "@/lib/email/campaigns/checks";

const fields = { subject: "10% off certified lots", previewText: "", headline: "Restocked", body: "Twelve lots came back.", buttonLabel: "Shop", buttonPath: "/products" };
const now = Date.parse("2026-10-05T17:00:00Z");
const code = { code: "OCT10", status: "active" as const, startsAt: null, endsAt: "2026-10-13T05:59:59Z", maxUses: null, uses: 0 };

describe("campaignChecks", () => {
  it("all clear", () => {
    const c = campaignChecks({ kind: "news", fields, lots: [], code: null, recipients: 2310 }, now);
    expect(c).toEqual([
      { level: "ok", text: "Compliance scan passed: subject, preview text, headline, body and button." },
      { level: "ok", text: "Button link is on auraprotocols.com." },
    ]);
    expect(isBlocked(c)).toBe(false);
  });

  it("a banned phrase blocks, naming the field", () => {
    const c = campaignChecks({ kind: "news", fields: { ...fields, body: "Pair them for your stack." }, lots: [], code: null, recipients: 1 }, now);
    expect(c[0]).toEqual({ level: "block", field: "body", text: 'Body: "stack" is a banned phrase. Fix it to send.' });
    expect(isBlocked(c)).toBe(true);
  });

  it("an off-site button link blocks", () => {
    const c = campaignChecks({ kind: "news", fields: { ...fields, buttonPath: "@evil.com" }, lots: [], code: null, recipients: 1 }, now);
    expect(c).toContainEqual({ level: "block", field: "buttonPath", text: "Button link must be a path on auraprotocols.com, like /products." });
  });

  it("new lots: every lot must still be waiting", () => {
    const ok = campaignChecks({ kind: "new_lots", fields, lots: [{ lot: "AP-1", waiting: true }], code: null, recipients: 1 }, now);
    expect(ok).toContainEqual({ level: "ok", text: "Every lot is still live and certified." });
    const bad = campaignChecks({ kind: "new_lots", fields, lots: [{ lot: "AP-1", waiting: false }], code: null, recipients: 1 }, now);
    expect(bad).toContainEqual({ level: "block", field: "lots", text: "AP-1 isn't waiting to announce any more (sold out, hidden, or already announced). Untick it." });
  });

  it("promotion: missing, ended, used up and paused codes block", () => {
    const run = (c: Parameters<typeof campaignChecks>[0]["code"]) => campaignChecks({ kind: "promotion", fields, lots: [], code: c, recipients: 10 }, now);
    expect(run(null)).toContainEqual({ level: "block", field: "discountCodeId", text: "The linked code no longer exists. Pick another." });
    expect(run({ ...code, status: "ended" })).toContainEqual({ level: "block", field: "discountCodeId", text: "OCT10 has ended. Pick another code." });
    expect(run({ ...code, status: "used_up" })).toContainEqual({ level: "block", field: "discountCodeId", text: "OCT10 is used up. Raise its limit in Discounts or pick another code." });
    expect(run({ ...code, status: "paused" })).toContainEqual({ level: "block", field: "discountCodeId", text: "OCT10 is paused. Resume it in Discounts first." });
  });

  it("promotion: not started yet and short on uses only warn", () => {
    const c = campaignChecks({ kind: "promotion", fields, lots: [], code: { ...code, status: "scheduled", startsAt: "2026-10-08T06:00:00Z", maxUses: 500, uses: 0 }, recipients: 2310 }, now);
    expect(c).toContainEqual({ level: "warn", field: "discountCodeId", text: "OCT10 starts Oct 8. Sending before then means the code won't work yet: schedule for Oct 8 or later." });
    expect(c).toContainEqual({ level: "warn", field: "discountCodeId", text: "OCT10 has 500 uses left and 2,310 people will get this. Once it's used up, the code stops working at checkout. Raise the limit in Discounts if you want everyone to be able to use it." });
    expect(isBlocked(c)).toBe(false);
  });

  it("a code that starts before the send time doesn't warn", () => {
    const c = campaignChecks({ kind: "promotion", fields, lots: [], code: { ...code, status: "scheduled", startsAt: "2026-10-08T06:00:00Z" }, recipients: 1 }, Date.parse("2026-10-08T15:00:00Z"));
    expect(c.some((x) => x.level === "warn")).toBe(false);
  });
});
