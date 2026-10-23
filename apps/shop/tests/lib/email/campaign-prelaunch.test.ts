import { describe, it, expect } from "vitest";
import {
  AUDIENCES, AUDIENCE_LABEL, CAMPAIGN_KINDS, EDITOR_AUDIENCES, EDITOR_KINDS, KIND_LABEL, PRELAUNCH, PRELAUNCH_KINDS,
  isPrelaunch, parseCampaignForm, parseKind,
} from "@/lib/email/campaigns/rules";
import { campaignEmail } from "@/lib/email/campaigns/render";
import { campaignChecks, isBlocked } from "@/lib/email/campaigns/checks";
import { firstLookEmail, weAreOpenEmail } from "@/lib/email/prelaunch";

const ctx = { site: "https://auraprotocols.com", unsubscribeUrl: "https://auraprotocols.com/api/unsubscribe?e=a%40b.co&s=x", mailingAddress: "Aura Protocols LLC · 30 N Gould St, Sheridan, WY 82801" };
const empty = { headline: "", body: "", buttonLabel: "", buttonPath: "" };

describe("pre-launch campaign kinds", () => {
  it("are campaign kinds the editor can't make", () => {
    expect(PRELAUNCH_KINDS).toEqual(["first_look", "we_are_open"]);
    expect(EDITOR_KINDS).toEqual(["new_lots", "promotion", "news"]);
    expect(CAMPAIGN_KINDS).toEqual([...EDITOR_KINDS, ...PRELAUNCH_KINDS]);
    expect(parseKind("first_look")).toBe("news");
    expect(isPrelaunch("we_are_open")).toBe(true);
    expect(isPrelaunch("news")).toBe(false);
    expect(KIND_LABEL.first_look).toBe("Pre-launch · A first look");
  });

  it("have the waitlist audiences, which the editor can't pick", () => {
    expect(AUDIENCES).toEqual([...EDITOR_AUDIENCES, "waitlist", "waitlist_never_ordered"]);
    expect(AUDIENCE_LABEL.waitlist_never_ordered).toBe("Waitlist, no order yet");
    const r = parseCampaignForm("news", { name: "n", subject: "s", headline: "h", audience: "waitlist" }, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.audience).toBeTruthy();
  });

  it("come with fixed names, subjects and audiences", () => {
    expect(PRELAUNCH.first_look).toMatchObject({ step: 2, name: "Pre-launch · A first look", subject: "A first look at the vials", audience: "waitlist" });
    expect(PRELAUNCH.we_are_open).toMatchObject({ step: 4, name: "Pre-launch · We're open", subject: "We're open", audience: "waitlist_never_ordered" });
  });

  it("render as the ready-made emails, [Test] on a test send", () => {
    const base = { previewText: "", content: empty, lots: [], code: null };
    expect(campaignEmail({ ...base, kind: "first_look", subject: "ignored" }, ctx).html).toBe(firstLookEmail(ctx).html);
    const t = campaignEmail({ ...base, kind: "we_are_open", subject: "ignored" }, ctx, { test: true });
    expect(t.subject).toBe("[Test] We're open");
    expect(t.html).toBe(weAreOpenEmail(ctx).html);
  });

  it("pass the checks with empty content, saying the wording is approved", () => {
    const c = campaignChecks({ kind: "first_look", fields: { subject: "A first look at the vials", previewText: "", ...empty }, lots: [], code: null, recipients: 12 }, Date.now());
    expect(isBlocked(c)).toBe(false);
    expect(c).toContainEqual({ level: "ok", text: "Ready-made pre-launch email: the wording was approved 2026-10-23." });
  });
});
