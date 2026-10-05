import { describe, it, expect } from "vitest";
import { CHAPTERS, SECTIONS, chapterForPath, chapterNumber, guideHref, sectionId, GUIDE_PATH } from "@/components/admin/guide/chapters";

describe("guide chapters", () => {
  it("has unique ids in the agreed order", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(["start", "discounts", "orders", "customers", "partners", "payouts"]);
    expect(chapterNumber("start")).toBe(1);
    expect(chapterNumber("payouts")).toBe(6);
  });

  it("maps each live admin page (and its sub-pages) to its chapter", () => {
    expect(chapterForPath("/admin/discounts")).toBe("discounts");
    expect(chapterForPath("/admin/discounts/batch/abc")).toBe("discounts");
    expect(chapterForPath("/admin/orders")).toBe("orders");
    expect(chapterForPath("/admin/partners")).toBe("partners");
    expect(chapterForPath("/admin/payouts")).toBe("payouts");
    expect(chapterForPath("/admin/customers/abc")).toBe("customers");
  });

  it("has no chapter for the Guide itself, Today, or look-alike paths", () => {
    expect(chapterForPath(GUIDE_PATH)).toBeNull();
    expect(chapterForPath("/admin")).toBeNull();
    expect(chapterForPath("/admin/ordersx")).toBeNull();
  });

  it("builds anchors", () => {
    expect(guideHref("discounts")).toBe("/admin/guide#discounts");
    expect(sectionId("orders", "how")).toBe("orders-how");
    expect(SECTIONS.map((s) => s.title)).toEqual(["Common tasks", "How it works", "Watch out for"]);
  });
});
