import { describe, it, expect } from "vitest";
import { replyViolation } from "@/lib/inquiries/checks";

describe("replyViolation", () => {
  it("names the whole word that tripped the scan", () => {
    expect(replyViolation("Most people reconstitute with 2 ml", [])).toEqual({ phrase: "reconstitute" });
    expect(replyViolation("the usual dosing is", [])).toEqual({ phrase: "dosing" });
  });
  it("passes ordinary support text, and blanks the customer's own name", () => {
    expect(replyViolation("Thanks, Dana — replacements ship tomorrow.", [])).toBeNull();
    expect(replyViolation("Hi Treat, thanks for writing.", ["Treat"])).toBeNull();
  });
  it("a name that is a substring of a banned word never blanks the real word", () => {
    expect(replyViolation("Hi Ben, ask about the benefits", ["Ben"])).toEqual({ phrase: "benefits" });
    expect(replyViolation("Hi Pro, read our protocol", ["Pro"])).toEqual({ phrase: "protocol" });
  });
  it("never names an occurrence inside the scanner's own allowed legal sentence", () => {
    const text = "These products are not intended to diagnose, treat, cure, or prevent any disease. Our treatment info is below.";
    expect(replyViolation(text, [])).toEqual({ phrase: "treatment" });
  });
});
