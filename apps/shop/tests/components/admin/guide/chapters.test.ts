import { describe, it, expect } from "vitest";
import { CHAPTERS, SECTIONS, chapterForPath, chapterNumber, guideHref, sectionId, GUIDE_PATH } from "@/components/admin/guide/chapters";

describe("guide chapters", () => {
  it("has unique ids in the agreed order", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(["start", "today", "discounts", "orders", "customers", "disputes", "catalog", "email", "inquiries", "partners", "payouts", "activity", "team"]);
    expect(chapterNumber("start")).toBe(1);
    expect(chapterNumber("payouts")).toBe(11);
    expect(chapterForPath("/admin/activity")).toBe("activity");
    expect(chapterForPath("/admin/team")).toBe("team");
  });

  it("Catalog & lots is a chapter under Stock and owns its pages", () => {
    expect(CHAPTERS.find((c) => c.id === "catalog")).toEqual({ id: "catalog", title: "Catalog & lots", group: "Stock", href: "/admin/catalog" });
    expect(chapterForPath("/admin/catalog/ss-31")).toBe("catalog");
  });

  it("maps each live admin page (and its sub-pages) to its chapter", () => {
    expect(chapterForPath("/admin/discounts")).toBe("discounts");
    expect(chapterForPath("/admin/discounts/batch/abc")).toBe("discounts");
    expect(chapterForPath("/admin/orders")).toBe("orders");
    expect(chapterForPath("/admin/partners")).toBe("partners");
    expect(chapterForPath("/admin/payouts")).toBe("payouts");
    expect(chapterForPath("/admin/customers/abc")).toBe("customers");
    expect(chapterForPath("/admin/disputes")).toBe("disputes");
    expect(chapterForPath("/admin/disputes/0b6f1c2e-1111-4222-8333-944455556666")).toBe("disputes");
    expect(chapterForPath("/admin/catalog")).toBe("catalog");
    expect(chapterForPath("/admin/email")).toBe("email");
    expect(chapterForPath("/admin/email/campaigns/x")).toBe("email");
  });

  it("has no chapter for the Guide itself or look-alike paths", () => {
    expect(chapterForPath(GUIDE_PATH)).toBeNull();
    expect(chapterForPath("/admin/ordersx")).toBeNull();
  });

  it("maps the Inquiries pages (list, thread, saved replies) to its chapter", () => {
    expect(chapterForPath("/admin/inquiries")).toBe("inquiries");
    expect(chapterForPath("/admin/inquiries/Q-1047")).toBe("inquiries");
    expect(chapterForPath("/admin/inquiries/replies")).toBe("inquiries");
  });

  it("Today owns /admin and Past alerts only — never the whole admin", () => {
    expect(CHAPTERS.find((c) => c.id === "today")).toEqual({ id: "today", title: "Today", group: null, href: "/admin" });
    expect(chapterForPath("/admin")).toBe("today");
    expect(chapterForPath("/admin/alerts")).toBe("today");
    expect(chapterForPath("/admin/orders")).toBe("orders");
    expect(chapterForPath("/admin/email/runs")).toBe("email");
  });

  it("builds anchors", () => {
    expect(guideHref("discounts")).toBe("/admin/guide#discounts");
    expect(sectionId("orders", "how")).toBe("orders-how");
    expect(SECTIONS.map((s) => s.title)).toEqual(["Common tasks", "How it works", "Watch out for"]);
  });
});
