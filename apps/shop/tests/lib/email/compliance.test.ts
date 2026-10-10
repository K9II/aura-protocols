import { describe, it, expect } from "vitest";
import { assertCompliant, blankOut } from "@/lib/email/compliance";

describe("blankOut", () => {
  it("blanks whole tokens only — never eats into a longer word", () => {
    expect(blankOut("benefits", ["Ben"])).toBe("benefits");
    expect(blankOut("the protocol is clear", ["Pro"])).toBe("the protocol is clear");
  });
  it("still blanks the token when it stands alone", () => {
    expect(blankOut("Ben said hi", ["Ben"])).toBe("  said hi");
    expect(blankOut("Hi Treat, thanks", ["Treat"])).toBe("Hi  , thanks");
  });
});

describe("assertCompliant", () => {
  it("passes clean copy", () => {
    expect(() => assertCompliant("What 99% looks like", "<p>Purity has a <em>method.</em></p>")).not.toThrow();
  });

  it("throws on banned words in the subject or the visible body", () => {
    expect(() => assertCompliant("No dosing, no hype", "<p>ok</p>")).toThrow(/dose/);
    expect(() => assertCompliant("ok", "<p>Recommended <b>dose</b></p>")).toThrow(/email failed compliance scan/);
  });

  it("ignores markup and styles", () => {
    expect(() => assertCompliant("ok", '<style>.dose{}</style><p class="treatment">fine</p>')).not.toThrow();
  });

  it("ignores the customer's own name and email (raw or HTML-escaped)", () => {
    expect(() => assertCompliant("Hi Treat", "<p>Hi Treat O&#39;Dose — thanks</p>", ["Treat", "Treat O'Dose"])).not.toThrow();
  });

  it("a name that is a substring of a banned word never blanks the real word", () => {
    expect(() => assertCompliant("Hi Ben", "<p>Hi Ben — ask about the benefits</p>", ["Ben"])).toThrow(/benefit/);
    expect(() => assertCompliant("Hi Pro", "<p>Hi Pro — read our protocol</p>", ["Pro"])).toThrow(/protocol/);
  });

  it("a name that is itself a banned word is still blanked when standing alone", () => {
    expect(() => assertCompliant("Hi Treat", "<p>Hi Treat — thanks for writing</p>", ["Treat"])).not.toThrow();
  });
});
