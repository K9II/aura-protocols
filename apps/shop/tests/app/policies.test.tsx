import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import TermsPage from "@/app/terms/page";

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
