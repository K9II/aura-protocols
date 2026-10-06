import { describe, it, expect } from "vitest";
import { assertCompliant } from "@/lib/email/compliance";

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
});
