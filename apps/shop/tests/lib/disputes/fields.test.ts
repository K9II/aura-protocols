import { describe, it, expect } from "vitest";
import { EDITABLE_FIELDS, parseDraft } from "@/lib/disputes/fields";

const form = (o: Record<string, string> = {}) => {
  const m = new Map<string, string>(EDITABLE_FIELDS.map((k) => [k, `value of ${k}`]));
  for (const [k, v] of Object.entries(o)) m.set(k, v);
  return (k: string) => m.get(k) ?? null;
};

describe("evidence draft fields", () => {
  it("trims, normalises line endings and keeps all eight fields in order", () => {
    const r = parseDraft(form({ uncategorized_text: "  To the card issuer,\r\n\r\nThanks  " }));
    expect(r.ok && r.value.uncategorized_text).toBe("To the card issuer,\n\nThanks");
    expect(r.ok && Object.keys(r.value)).toEqual([...EDITABLE_FIELDS]);
  });

  it("requires the letter, name, email and product description; shipping fields may be empty (not shipped)", () => {
    expect(parseDraft(form({ uncategorized_text: " ", customer_name: "", shipping_carrier: "", shipping_tracking_number: "" })))
      .toEqual({ ok: false, fieldErrors: { uncategorized_text: "Required.", customer_name: "Required." } });
  });

  it("caps lengths at Stripe's limits", () => {
    expect(parseDraft(form({ uncategorized_text: "x".repeat(20_001) })))
      .toEqual({ ok: false, fieldErrors: { uncategorized_text: "Too long: 20,000 characters at most." } });
  });
});
