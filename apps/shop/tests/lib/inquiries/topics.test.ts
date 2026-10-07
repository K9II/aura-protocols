import { describe, it, expect } from "vitest";
import { TOPICS, TOPIC_LABEL, TOPIC_TAG, inquirySubject, parseTopic } from "@/lib/inquiries/topics";

describe("inquiry topics", () => {
  it("has the five form topics with labels and short tags", () => {
    expect(TOPICS).toEqual(["order", "product", "wholesale", "account", "other"]);
    expect(TOPIC_LABEL).toEqual({ order: "Order question", product: "Product or COA", wholesale: "Wholesale", account: "Account", other: "Other" });
    expect(TOPIC_TAG.order).toBe("Order");
  });

  it("parses only known topics", () => {
    expect(parseTopic("wholesale")).toBe("wholesale");
    expect(parseTopic("affiliate")).toBeNull();
    expect(parseTopic(null)).toBeNull();
  });

  it("builds the thread subject from the topic, order number and organization", () => {
    expect(inquirySubject("order", "AP-1052", null)).toBe("Order question — AP-1052");
    expect(inquirySubject("order", null, null)).toBe("Order question");
    expect(inquirySubject("wholesale", null, "Meridian Peptide Lab")).toBe("Wholesale inquiry — Meridian Peptide Lab");
    expect(inquirySubject("product", null, null)).toBe("Product or COA question");
    expect(inquirySubject("account", null, null)).toBe("Account question");
    expect(inquirySubject("other", null, null)).toBe("Message");
  });
});
