import { describe, it, expect } from "vitest";
import {
  AUDIENCES, AUDIENCE_LABEL, CAMPAIGN_KINDS, EDITOR_AUDIENCES, EDITOR_KINDS, KIND_LABEL, PRELAUNCH, PRELAUNCH_KINDS,
  isPrelaunch, parseCampaignForm, parseKind,
} from "@/lib/email/campaigns/rules";
import { campaignEmail } from "@/lib/email/campaigns/render";
import { campaignChecks, isBlocked } from "@/lib/email/campaigns/checks";
import { earlyAccessEmail, firstLookEmail, weAreOpenEmail } from "@/lib/email/prelaunch";

const ctx = { site: "https://auraprotocols.com", unsubscribeUrl: "https://auraprotocols.com/api/unsubscribe?e=a%40b.co&s=x", mailingAddress: "Aura Protocols LLC · 30 N Gould St, Sheridan, WY 82801" };
const empty = { headline: "", body: "", buttonLabel: "", buttonPath: "" };

describe("pre-launch campaign kinds", () => {
  it("are campaign kinds the editor can't make", () => {
    expect(PRELAUNCH_KINDS).toEqual(["first_look", "early_access", "we_are_open"]);
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
    expect(PRELAUNCH.early_access).toMatchObject({ step: 3, name: "Pre-launch · Early access", subject: "Your early access is open", audience: "waitlist" });
    expect(PRELAUNCH.we_are_open).toMatchObject({ step: 4, name: "Pre-launch · We're open", subject: "We're open", audience: "waitlist_never_ordered" });
  });

  const invite = { url: "https://auraprotocols.com/?r=K7QM2P", label: "auraprotocols.com/?r=K7QM2P" };

  it("render as the ready-made emails with the person's invite link, [Test] on a test send, and refuse without one", () => {
    const base = { previewText: "", content: empty, lots: [], code: null, invite };
    expect(campaignEmail({ ...base, kind: "first_look", subject: "ignored" }, ctx).html).toBe(firstLookEmail(ctx, invite).html);
    const t = campaignEmail({ ...base, kind: "we_are_open", subject: "ignored" }, ctx, { test: true });
    expect(t.subject).toBe("[Test] We're open");
    expect(t.html).toBe(weAreOpenEmail(ctx, invite).html);
    expect(() => campaignEmail({ ...base, invite: null, kind: "first_look", subject: "s" }, ctx)).toThrow(/no invite link/);
  });

  it("early access renders the person's own email, and refuses without one", () => {
    const base = { previewText: "", content: { ...empty, openingOn: "2026-12-01" }, lots: [], code: null, invite };
    const early = { openingOn: "2026-12-01", url: "https://auraprotocols.com/early?t=K7QM2P.s", priceCents: 17500 };
    const t = campaignEmail({ ...base, kind: "early_access", subject: "ignored", early }, ctx, { test: true });
    expect(t.subject).toBe("[Test] Your early access is open");
    expect(t.html).toBe(earlyAccessEmail(ctx, early, invite).html);
    expect(() => campaignEmail({ ...base, kind: "early_access", subject: "s" }, ctx)).toThrow(/no opening date/);
  });

  it("early access is blocked until the opening date is saved, and always warns about payments", () => {
    const fields = { subject: "Your early access is open", previewText: "", ...empty };
    const none = campaignChecks({ kind: "early_access", fields, lots: [], code: null, recipients: 12 }, Date.now());
    expect(isBlocked(none)).toBe(true);
    expect(none.find((x) => x.level === "block")?.field).toBe("openingOn");
    const dated = campaignChecks({ kind: "early_access", fields, lots: [], code: null, recipients: 12, openingOn: "2026-12-01" }, Date.now());
    expect(isBlocked(dated)).toBe(false);
    expect(dated).toContainEqual({ level: "ok", text: "Opening date: Tuesday, December 1." });
    expect(dated.some((x) => x.level === "warn" && /take payments/.test(x.text))).toBe(true);
  });

  it("pass the checks with empty content, saying the wording is approved", () => {
    const c = campaignChecks({ kind: "first_look", fields: { subject: "A first look at the vials", previewText: "", ...empty }, lots: [], code: null, recipients: 12 }, Date.now());
    expect(isBlocked(c)).toBe(false);
    expect(c).toContainEqual({ level: "ok", text: "Ready-made pre-launch email: the wording was approved 2026-10-23." });
  });
});
