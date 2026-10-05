import { describe, it, expect } from "vitest";
import { orderConfirmationEmail, shippedEmail, ownerNewOrderEmail, storeCreditAddedEmail, trackingUrl } from "@/lib/emails";
import type { OrderRow } from "@/lib/orders";
import { findViolations } from "../../scripts/compliance-scan.mjs";

const order = {
  order_number: "AP-1042", email: "j@lab.org", ship_name: "Jane <b>", ship_line1: "1 A St", ship_line2: null,
  ship_city: "Austin", ship_state: "TX", ship_zip: "78701", subtotal_cents: 28230, shipping_cents: 0, insurance_cents: 550, tax_cents: 2329,
  total_cents: 31109, tracking_number: "9400111899223344556677", carrier: "usps",
  order_items: [{ compound_name: "BPC-157", strength: "10 mg", pack_qty: 3, quantity: 1, line_total_cents: 21330, lot_number: "AP-0001" }],
} as unknown as OrderRow;

describe("emails", () => {
  it("order confirmation lists items with lots, totals and the research-use notice, escaping HTML", () => {
    const { subject, html } = orderConfirmationEmail(order);
    expect(subject).toBe("Order AP-1042 confirmed");
    expect(html).toContain("BPC-157");
    expect(html).toContain("Lot AP-0001");
    expect(html).toContain("$311.09");
    expect(html).toContain("Shipping insurance");
    expect(html).toContain("Jane &lt;b&gt;");
    expect(html).toMatch(/research use only/i);
  });

  it("receipts show the partner code and store credit so the lines add up", () => {
    const withCode = { ...order, partner_discount_cents: 490, store_credit_cents: 0 } as OrderRow;
    expect(orderConfirmationEmail(withCode).html).toMatch(/Discount code[\s\S]*−\$4\.90/);
    const plain = orderConfirmationEmail({ ...order, partner_discount_cents: 0, store_credit_cents: 0 } as OrderRow).html;
    expect(plain).not.toMatch(/Discount code|store credit/i);
    const credit = ownerNewOrderEmail({ ...order, partner_discount_cents: 0, store_credit_cents: 5000 } as OrderRow).html;
    expect(credit).toMatch(/Paid with store credit[\s\S]*−\$50\.00/);
    expect(credit).toMatch(/Charged[\s\S]*\$261\.09/);
  });

  it("shipped email links the carrier tracking page", () => {
    expect(trackingUrl("usps", "9400")).toBe("https://tools.usps.com/go/TrackConfirmAction?tLabels=9400");
    expect(shippedEmail(order).html).toContain(trackingUrl("usps", "9400111899223344556677"));
  });

  it("owner alert names the order and total", () => {
    expect(ownerNewOrderEmail(order).subject).toBe("New order AP-1042 — $311.09");
  });

  it("templates carry no banned phrases", () => {
    for (const { html } of [orderConfirmationEmail(order), shippedEmail(order), ownerNewOrderEmail(order)]) {
      expect(findViolations(html.replace(/<[^>]+>/g, " "))).toEqual([]);
    }
  });

  it("labels a new-account discount in the order email", () => {
    const html = orderConfirmationEmail({ ...order, partner_discount_cents: 735, new_account_discount: true } as OrderRow).html;
    expect(html).toContain("New-account 15%");
  });

  it("verify email links to the token URL and passes the scan", async () => {
    const { verifyEmail } = await import("@/lib/emails");
    const { findViolations, visibleText } = await import("../../scripts/compliance-scan.mjs");
    const m = verifyEmail("https://auraprotocols.com/auth/verify?token=abc");
    expect(m.subject).toBe("Confirm your email");
    expect(m.html).toContain("https://auraprotocols.com/auth/verify?token=abc");
    expect(findViolations(`${m.subject} ${visibleText(m.html)}`)).toEqual([]);
  });
});

describe("storeCreditAddedEmail", () => {
  it("states amount and balance, tells them to tick Apply store credit, and escapes the message", () => {
    const m = storeCreditAddedEmail(5_000, 17_000, "Thanks <b>so</b> much", "https://auraprotocols.com");
    expect(m.subject).toBe("$50.00 store credit added to your account");
    expect(m.html).toContain("$170.00");
    expect(m.html).toContain("Apply store credit");
    expect(m.html).toContain("Thanks &lt;b&gt;so&lt;/b&gt; much");
    expect(m.html).toContain('href="https://auraprotocols.com/account"');
    expect(findViolations(m.html.replace(/<[^>]+>/g, " "))).toEqual([]);
  });
  it("leaves the message out when there isn't one", () => {
    expect(storeCreditAddedEmail(5_000, 5_000, null, "https://x.test").html).not.toContain("border-left");
  });
});
