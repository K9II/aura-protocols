import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findViolations } from "../../../scripts/compliance-scan.mjs";
import {
  POLICY_EXCERPTS, buildEvidence, customerStrings, editable, evidenceSections, fileFields, letterKind, toStripeEvidence,
} from "@/lib/disputes/evidence";
import { EDITABLE_FIELDS } from "@/lib/disputes/fields";
import { facts, unshipped } from "../../helpers/dispute-fixtures";

const TRACK_URL = "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223401552788";
const REASONS = ["product_not_received", "fraudulent", "unrecognized", "product_unacceptable", "credit_not_processed", "general", "duplicate"];

describe("dispute evidence", () => {
  it("fills every field from the records", () => {
    const e = buildEvidence(facts());
    expect(e).toMatchObject({
      customer_name: "Dana Whitfield", customer_email_address: "dana.w@example.com",
      shipping_address: "Dana Whitfield, 1420 Elm St, Apt 3, Boulder, CO 80302",
      shipping_carrier: "USPS", shipping_tracking_number: "9400111899223401552788", shipping_date: "September 22, 2026",
      billing_address: "Dana Whitfield, 1420 Elm St, Boulder, CO 80302, US",
      product_description: "Research chemicals for laboratory research use only, not for human or animal use: BPC-157 10 mg (lot AP-BPC-2604, 99.4% HPLC, 3 vials); TB-500 10 mg (lot AP-TB5-2603, 99.1% HPLC, 2 vials). Each lot has an independent certificate of analysis.",
    });
    expect(e.access_activity_log.split("\n")).toEqual([
      "Account created: 2026-09-15 01:02:00 UTC (dana.w@example.com)",
      "Agreement accepted: 2026-09-15 01:02:41 UTC · terms version 2026-09-27 · 21 or older: yes · research use only: yes · Refund & Dispute Policy, including contacting us before a dispute: yes · IP fingerprint (salted SHA-256): 9f3ce21a · device: Safari on iPhone",
      "Last sign-in: 2026-09-21 15:58:00 UTC",
      "Order AP-1031 placed: 2026-09-21 16:00:00 UTC · research use confirmed at checkout: 2026-09-21 16:00:00 UTC",
      "Order AP-1031 paid: 2026-09-21 16:02:00 UTC · Visa ending 4242",
      "Order AP-1031 shipped: 2026-09-22 18:00:00 UTC · USPS 9400111899223401552788",
      "Earlier order AP-1009 paid: 2026-09-15 17:00:00 UTC (not disputed)",
    ]);
    expect(e.refund_policy_disclosure).toContain("when creating their account on September 14, 2026 (a required checkbox, recorded with a timestamp; terms version 2026-09-27)");
    expect(e.refund_policy_disclosure).toContain("https://auraprotocols.com/refund-policy");
    expect(e.refund_refusal_explanation).toMatch(/^Order AP-1031 shipped on September 22, 2026\. .*cannot be cancelled, returned, or refunded/);
    expect(Object.keys(editable(e))).toEqual([...EDITABLE_FIELDS]);
  });

  it("not received: shipping, tracking link, insurance, the agreement and the products", () => {
    const letter = buildEvidence(facts()).uncategorized_text;
    const paras = letter.split("\n\n");
    expect(paras[0]).toBe("To the card issuer,");
    expect(paras[1]).toBe("The cardholder states that order AP-1031 was not received. Our records show it was shipped on September 22, 2026 by USPS (tracking 9400111899223401552788) to the name and address the cardholder entered at checkout: Dana Whitfield, 1420 Elm St, Apt 3, Boulder, CO 80302.");
    expect(paras[2]).toBe(`Carrier tracking: ${TRACK_URL}`);
    expect(paras[3]).toMatch(/^Every order includes shipping insurance/);
    expect(paras[4]).toBe("The cardholder created an account with us (dana.w@example.com) on September 14, 2026 and, before any purchase, agreed to our Terms and our Refund & Dispute Policy (version 2026-09-27), confirming that they are 21 or older, the products are for laboratory research use only, and they would contact us before filing a payment dispute. At checkout on September 21, 2026 they confirmed again that the order was for laboratory research use only. The timestamped agreement record is attached.");
    expect(letter).toContain("BPC-157 10 mg (lot AP-BPC-2604, 3 vials); TB-500 10 mg (lot AP-TB5-2603, 2 vials)");
    expect(paras.slice(-2)).toEqual(["We ask that the dispute be decided in our favour.", "Aura Protocols LLC"]);
  });

  it("fraud and unrecognized: the cardholder's own account, earlier undisputed orders", () => {
    const fraud = buildEvidence(facts({ reason: "fraudulent" })).uncategorized_text;
    expect(fraud).toContain("The cardholder states they did not authorize order AP-1031 ($412.00, paid September 21, 2026). The purchase was made from the cardholder's own account with us.");
    expect(fraud).toContain("The same account has 1 earlier order that was paid and not disputed: AP-1009 (September 15, 2026).");
    expect(fraud).toContain("Our records show order AP-1031 was shipped on September 22, 2026");
    expect(buildEvidence(facts({ reason: "unrecognized" })).uncategorized_text).toContain("they do not recognize order AP-1031");
    expect(buildEvidence(facts({ reason: "fraudulent", priorOrders: [] })).uncategorized_text).not.toContain("earlier order");
  });

  it("not as described: lot testing and no returns after shipping", () => {
    const letter = buildEvidence(facts({ reason: "product_unacceptable" })).uncategorized_text;
    expect(letter).toContain("order AP-1031 was not as described");
    expect(letter).toContain("tested by an independent laboratory");
    expect(letter).toContain("once an order has shipped it cannot be cancelled, returned, or refunded");
  });

  it("credit not processed: no refund owed once shipped; before shipping it says the order can still be cancelled", () => {
    expect(buildEvidence(facts({ reason: "credit_not_processed" })).uncategorized_text).toContain("No refund is owed.");
    const early = buildEvidence(unshipped({ reason: "credit_not_processed" }));
    expect(early.uncategorized_text).not.toContain("No refund is owed.");
    expect(early.uncategorized_text).toContain("The order has not shipped.");
    expect(early.refund_refusal_explanation).toBe("Order AP-1031 has not shipped. Under our Refund & Dispute Policy it can be cancelled for a full refund until it ships.");
    expect(early).toMatchObject({ shipping_carrier: "", shipping_tracking_number: "", shipping_date: "" });
    expect(early.access_activity_log).not.toContain("shipped:");
  });

  it("anything else gets the general letter", () => {
    expect(letterKind("duplicate")).toBe("general");
    expect(buildEvidence(facts({ reason: "duplicate" })).uncategorized_text).toContain("The cardholder has disputed order AP-1031 ($412.00, paid September 21, 2026).");
  });

  it("without an agreement on file it says what we do hold", () => {
    const e = buildEvidence(facts({ agreement: null }));
    expect(e.uncategorized_text).toContain("The order was placed from the cardholder's account with us (dana.w@example.com), created on September 14, 2026.");
    expect(e.access_activity_log).toContain("Agreement accepted: no record on file");
  });

  it("every letter and field passes the compliance scan, shipped or not, with or without an agreement", () => {
    for (const reason of REASONS) {
      for (const f of [facts({ reason }), unshipped({ reason }), facts({ reason, agreement: null })]) {
        expect(findViolations(Object.values(buildEvidence(f)).join("\n")), reason).toEqual([]);
      }
    }
  });

  it("quotes the Refund & Dispute Policy word for word", () => {
    const page = readFileSync(join(__dirname, "..", "..", "..", "src", "app", "refund-policy", "page.tsx"), "utf8")
      .replace(/&apos;/g, "'").replace(/&mdash;/g, "—").replace(/\s+/g, " ");
    for (const e of POLICY_EXCERPTS) expect(page).toContain(e.replace(/\.$/, ""));
  });

  it("Stripe evidence: non-empty text plus the file ids; never a purchase IP", () => {
    const e = buildEvidence(facts());
    const out = toStripeEvidence({ ...e, shipping_date: "" }, { uncategorized_file: "file_a", shipping_documentation: "file_b" });
    expect(out.uncategorized_text).toBe(e.uncategorized_text);
    expect(out.access_activity_log).toBe(e.access_activity_log);
    expect(out.shipping_date).toBeUndefined();
    expect(out).toMatchObject({ uncategorized_file: "file_a", shipping_documentation: "file_b" });
    expect(out.receipt).toBeUndefined();
    expect(out.customer_purchase_ip).toBeUndefined();
  });

  it("which file fields the PDF goes in, by reason", () => {
    expect(fileFields("product_not_received", true)).toEqual(["uncategorized_file", "shipping_documentation"]);
    expect(fileFields("product_not_received", false)).toEqual(["uncategorized_file"]);
    expect(fileFields("fraudulent", true)).toEqual(["uncategorized_file", "receipt"]);
    expect(fileFields("unrecognized", false)).toEqual(["uncategorized_file", "receipt"]);
    expect(fileFields("general", true)).toEqual(["uncategorized_file"]);
  });

  it("PDF sections: receipt, shipping, lots with certificates, agreement, policy", () => {
    const s = evidenceSections(facts());
    expect(s.map((x) => x.title)).toEqual(["Receipt", "Shipping and delivery", "Lots shipped", "Account agreement", "Policy excerpts"]);
    expect(s[0].lines[0]).toBe("Order AP-1031 · placed 2026-09-21 16:00:00 UTC · paid 2026-09-21 16:02:00 UTC · Visa ending 4242");
    expect(s[0].lines).toContain("Subtotal $391.00 · shipping $0.00 · shipping insurance $5.50 · sales tax $15.50 · total $412.00");
    expect(s[1].lines).toEqual([
      "Shipped 2026-09-22 18:00:00 UTC by USPS · tracking 9400111899223401552788",
      "Ship to: Dana Whitfield, 1420 Elm St, Apt 3, Boulder, CO 80302",
      `Carrier tracking: ${TRACK_URL}`,
    ]);
    expect(s[2].lines).toEqual([
      "AP-BPC-2604 · BPC-157 10 mg · 3 vials · 99.4% HPLC · certificate: https://x.supabase.co/storage/v1/object/public/coa/AP-BPC-2604/1.pdf",
      "AP-TB5-2603 · TB-500 10 mg · 2 vials · 99.1% HPLC · certificate on request",
    ]);
    expect(s[4].lines[0]).toBe("Terms of Service and Refund & Dispute Policy, version 2026-09-27: https://auraprotocols.com/terms and https://auraprotocols.com/refund-policy");
    const early = evidenceSections(unshipped());
    expect(early[1].lines).toEqual(["Not shipped yet. Ship to: Dana Whitfield, 1420 Elm St, Apt 3, Boulder, CO 80302"]);
    expect(early[2].title).toBe("Lots held for this order");
  });

  it("lists the customer's own data (blanked before the compliance scan)", () => {
    expect(customerStrings(facts())).toEqual([
      "Dana Whitfield", "dana.w@example.com", "dana.w@example.com", "Dana Whitfield", "1420 Elm St", "Apt 3", "Boulder",
      "Dana Whitfield, 1420 Elm St, Apt 3, Boulder, CO 80302", "Dana Whitfield, 1420 Elm St, Boulder, CO 80302, US",
    ]);
  });
});
