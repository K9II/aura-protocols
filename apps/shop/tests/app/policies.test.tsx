import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import TermsPage from "@/app/terms/page";
import RefundPolicyPage from "@/app/refund-policy/page";
import ShippingPage from "@/app/shipping/page";
import PrivacyPage from "@/app/privacy/page";
import RuoPage from "@/app/ruo/page";
import { FLAT_SHIPPING_USD, FREE_SHIPPING_THRESHOLD_USD, SHIPPING_INSURANCE_USD, formatUsd } from "@/lib/cart";

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

describe("/shipping", () => {
  it("has the six sections in order", () => {
    const { ids } = renderPolicy(<ShippingPage />);
    expect(ids).toEqual(["destinations", "cost", "dispatch", "tracking", "insurance", "handling"]);
  });

  it("shows costs from the constants", () => {
    const { container } = renderPolicy(<ShippingPage />);
    const cost = container.querySelector("#cost")?.textContent ?? "";
    expect(cost).toContain(formatUsd(FLAT_SHIPPING_USD));
    expect(cost).toContain(formatUsd(FREE_SHIPPING_THRESHOLD_USD));
    expect(cost).toContain(formatUsd(SHIPPING_INSURANCE_USD));
    expect(cost).toContain("$300");
    expect(cost).toContain("$5.50");
  });

  it("makes no dispatch-time promise while the placeholder is null", () => {
    const { container } = renderPolicy(<ShippingPage />);
    expect(container.querySelector("#dispatch")?.textContent).not.toMatch(/business day/i);
  });

  it("links insurance to the refund policy", () => {
    const { container, text } = renderPolicy(<ShippingPage />);
    expect(container.querySelector('#insurance a[href="/refund-policy#transit-loss"]')).not.toBeNull();
    expectNoLegacyReturns(text);
  });
});

describe("/privacy", () => {
  it("has the six sections in order", () => {
    const { ids } = renderPolicy(<PrivacyPage />);
    expect(ids).toEqual(["collect", "cookies", "use", "sharing", "retention", "choices"]);
  });

  it("covers accounts, Stripe and every service provider", () => {
    const { container, text } = renderPolicy(<PrivacyPage />);
    expect(container.querySelector("#collect")?.textContent).toMatch(/optional organization/i);
    const sharing = container.querySelector("#sharing")?.textContent ?? "";
    for (const provider of ["Vercel", "Supabase", "Amazon SES", "Stripe", "fulfillment partner", "carriers"]) {
      expect(sharing).toContain(provider);
    }
    expect(container.querySelector("#cookies")?.textContent).toMatch(/sign-in session/i);
    expectNoLegacyReturns(text);
  });

  it("names promotions, research news and new-lot notices as opt-in email", () => {
    const { text } = renderPolicy(<PrivacyPage />);
    expect(text).toContain("to send promotions, research news and new-lot notices if you opt in");
  });

  it("has no leftover entry-gate language and describes the account-gate cookies", () => {
    const { container, text } = renderPolicy(<PrivacyPage />);
    expect(text).not.toMatch(/Entry confirmation/i);
    expect(text).not.toMatch(/entry screen/i);
    const cookies = container.querySelector("#cookies")?.textContent ?? "";
    expect(cookies).toMatch(/Remember me/i);
    expect(cookies).toMatch(/session ends when you close your browser/i);
    expect(cookies).toMatch(/signed security cookie/i);
    expect(cookies).toMatch(/60 days so the partner is credited/i);
  });
});

describe("/ruo", () => {
  it("has the four sections in order", () => {
    const { ids } = renderPolicy(<RuoPage />);
    expect(ids).toEqual(["meaning", "what-we-dont-do", "who-can-buy", "responsibility"]);
  });

  it("points buyers to the representations in the Terms", () => {
    const { container, text } = renderPolicy(<RuoPage />);
    expect(container.querySelector('#who-can-buy a[href="/terms#eligibility"]')).not.toBeNull();
    expectNoLegacyReturns(text);
  });
});
