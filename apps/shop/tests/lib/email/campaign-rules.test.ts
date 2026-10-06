import { describe, it, expect } from "vitest";
import {
  announceDraft, blankDraft, canMove, isEditable, kicker, nextHourMs, paragraphs, parseCampaignForm, scheduleError,
} from "@/lib/email/campaigns/rules";

const lot = (n: string, name = "BPC-157") => ({ compoundName: name, slug: "bpc-157", strengths: "10 mg", lot: n, purityPct: 99.4, method: "HPLC+MS" as const, testedOn: "2026-10-02", coaFile: `/coa/${n}.pdf` });
const form = (o: Record<string, string> = {}) => ({ name: "Oct promo", subject: "10% off", previewText: "", headline: "Restocked and *certified.*", body: "One.\n\nTwo.", buttonLabel: "Shop", buttonPath: "/products", audience: "all", discountCodeId: "c1", ...o });

describe("campaign status machine", () => {
  it("allows only the documented moves", () => {
    expect(canMove("draft", "scheduled")).toBe(true);
    expect(canMove("draft", "sending")).toBe(true);
    expect(canMove("scheduled", "draft")).toBe(true);
    expect(canMove("scheduled", "sending")).toBe(true);
    expect(canMove("sending", "sent")).toBe(true);
    expect(canMove("sending", "stopped")).toBe(true);
    expect(canMove("sent", "draft")).toBe(false);
    expect(canMove("stopped", "sending")).toBe(false);
    expect(canMove("sending", "draft")).toBe(false);
    expect(canMove("draft", "sent")).toBe(false);
  });
  it("only drafts are editable", () => {
    expect(isEditable("draft")).toBe(true);
    for (const s of ["scheduled", "sending", "sent", "stopped"] as const) expect(isEditable(s)).toBe(false);
  });
});

describe("parseCampaignForm", () => {
  it("accepts a complete promotion", () => {
    const r = parseCampaignForm("promotion", form(), []);
    expect(r).toEqual({ ok: true, value: {
      name: "Oct promo", subject: "10% off", previewText: "", audience: "all", discountCodeId: "c1", lots: [],
      content: { headline: "Restocked and *certified.*", body: "One.\n\nTwo.", buttonLabel: "Shop", buttonPath: "/products" },
    } });
  });
  it("requires name, subject, headline; a code for promotions; a lot for new lots", () => {
    const r = parseCampaignForm("promotion", form({ name: " ", subject: "", headline: "", discountCodeId: "" }), []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["discountCodeId", "headline", "name", "subject"]);
    const l = parseCampaignForm("new_lots", form(), []);
    expect(!l.ok && l.fieldErrors.lots).toBe("Tick at least one lot.");
    const ok = parseCampaignForm("new_lots", form(), ["AP-1"]);
    expect(ok.ok && ok.value).toMatchObject({ lots: ["AP-1"], discountCodeId: null });
  });
  it("button: both or neither, and only paths on our site", () => {
    for (const p of ["https://evil.example", "//evil.example", "products", "/a b"]) {
      const r = parseCampaignForm("news", form({ buttonPath: p }), []);
      expect(!r.ok && r.fieldErrors.buttonPath, p).toBe("Use a path on auraprotocols.com, like /products.");
    }
    expect(parseCampaignForm("news", form({ buttonPath: "" }), []).ok).toBe(false);
    expect(parseCampaignForm("news", form({ buttonLabel: "" }), []).ok).toBe(false);
    expect(parseCampaignForm("news", form({ buttonLabel: "", buttonPath: "" }), []).ok).toBe(true);
    expect(parseCampaignForm("news", form({ buttonPath: "/coa?lot=AP-1#top" }), []).ok).toBe(true);
  });
  it("enforces lengths and a known audience", () => {
    const r = parseCampaignForm("news", form({ subject: "x".repeat(151), audience: "vip" }), []);
    expect(!r.ok && r.fieldErrors).toEqual({ subject: "Keep it under 150 characters.", audience: "Pick an audience." });
  });
  it("normalizes Windows line breaks", () => {
    const r = parseCampaignForm("news", form({ body: "a\r\n\r\nb" }), []);
    expect(r.ok && r.value.content.body).toBe("a\n\nb");
  });
});

describe("text helpers", () => {
  it("paragraphs split on blank lines and join wrapped lines", () => {
    expect(paragraphs("One\nline.\n\n\nTwo.\n  \nThree.")).toEqual(["One line.", "Two.", "Three."]);
    expect(paragraphs("  ")).toEqual([]);
  });
  it("kicker per type", () => {
    expect(kicker("new_lots", null)).toBe("New lot · Certified");
    expect(kicker("news", null)).toBe("Research news");
    expect(kicker("promotion", null)).toBe("Promotion");
    expect(kicker("promotion", "2026-10-13T05:59:59Z")).toBe("Promotion · Through Oct 12");
  });
});

describe("scheduling", () => {
  const now = Date.parse("2026-10-05T17:14:00Z");
  it("next hour", () => expect(new Date(nextHourMs(now)).toISOString()).toBe("2026-10-05T18:00:00.000Z"));
  it("on the hour, from the next hour, within 90 days", () => {
    expect(scheduleError("2026-10-05T18:00:00Z", now)).toBeNull();
    expect(scheduleError("2026-10-05T17:00:00Z", now)).toBe("Pick the next hour or later.");
    expect(scheduleError("2026-10-05T18:30:00Z", now)).toBe("Pick a time on the hour.");
    expect(scheduleError("2027-02-01T00:00:00Z", now)).toBe("Pick a time in the next 90 days.");
    expect(scheduleError("nope", now)).toBe("Pick a date and time.");
  });
});

describe("drafts", () => {
  it("Announce fills a New lots draft", () => {
    expect(announceDraft([lot("AP-1")])).toEqual({
      name: "New lots: BPC-157", subject: "Certified: BPC-157, lot AP-1", previewText: "The certificate is linked inside.",
      audience: "all", discountCodeId: null, lots: ["AP-1"],
      content: { headline: "Lot AP-1 is *in.*", body: "", buttonLabel: "", buttonPath: "" },
    });
    const two = announceDraft([lot("AP-1"), lot("AP-2", "TB-500")]);
    expect(two).toMatchObject({ name: "New lots: BPC-157, TB-500", subject: "Certified: 2 new lots", previewText: "BPC-157 and TB-500, with their certificates." });
    expect(two.content.headline).toBe("2 new lots are *in.*");
  });
  it("blank drafts", () => {
    expect(blankDraft("news")).toMatchObject({ name: "", audience: "all", lots: [], discountCodeId: null, content: { headline: "", body: "", buttonLabel: "", buttonPath: "" } });
  });
});
