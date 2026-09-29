import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import TermsPage from "@/app/terms/page";
import RefundPolicyPage from "@/app/refund-policy/page";
import { SHIPPING_INSURANCE_USD, formatUsd } from "@/lib/cart";

function renderPolicy(ui: ReactElement) {
  const { container } = render(ui);
  const ids = Array.from(container.querySelectorAll("section[data-policy-section]")).map((s) => s.id);
  return { container, ids, text: container.textContent ?? "" };
}

// Wording from the old, lenient refund policy that must not survive anywhere.
function expectNoLegacyReturns(text: string) {
  expect(text).not.toMatch(/14 days/i);
  expect(text).not.toMatch(/unopened/i);
}

describe("/terms", () => {
  it("has the ten sections in order", () => {
    const { ids } = renderPolicy(<TermsPage />);
    expect(ids).toEqual(["research-use", "eligibility", "accounts", "orders", "finality", "restrictions", "liability", "site-use", "privacy", "law"]);
  });

  it("states order finality, buyer representations and the pending governing state", () => {
    const { text, container } = renderPolicy(<TermsPage />);
    expect(text).toMatch(/until your order ships/i);
    expect(text).toMatch(/qualified research or laboratory personnel/i);
    expect(container.querySelector("#law .s-pending")).toHaveTextContent("[State — pending]");
    expect(text).toMatch(/Acknowledgment/);
    expectNoLegacyReturns(text);
  });

  it("links finality to the transit-loss section of the refund policy", () => {
    const { container } = renderPolicy(<TermsPage />);
    expect(container.querySelector('#finality a[href="/refund-policy#transit-loss"]')).not.toBeNull();
  });
});

describe("/refund-policy", () => {
  it("has the five sections in order", () => {
    const { ids } = renderPolicy(<RefundPolicyPage />);
    expect(ids).toEqual(["cancellations", "finality", "transit-loss", "chargebacks", "questions"]);
  });

  it("is strict after shipment and replacement-only for transit claims", () => {
    const { container, text } = renderPolicy(<RefundPolicyPage />);
    const transit = container.querySelector("#transit-loss")?.textContent ?? "";
    expect(transit).toContain(formatUsd(SHIPPING_INSURANCE_USD));
    expect(transit).toMatch(/48 hours/);
    expect(transit).toMatch(/no cash refunds/i);
    expect(container.querySelector("#finality")?.textContent).toMatch(/cannot be cancelled, returned, or refunded/i);
    expectNoLegacyReturns(text);
  });
});
