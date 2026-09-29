import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PolicyPage from "@/components/store/PolicyPage";
import { POLICIES } from "@/lib/policies";
import { TERMS_VERSION } from "@/lib/gate-shared";

const sections = [
  { id: "alpha", heading: "Alpha heading", body: <p>Alpha body</p> },
  { id: "beta", heading: "Beta heading", body: <p>Beta body</p> },
  { id: "gamma", heading: "Gamma heading", body: <p>Gamma body</p> },
];

function renderPage(closing?: React.ReactNode) {
  return render(
    <PolicyPage
      policy="shipping"
      title={<>Shipping <em>Policy.</em></>}
      updated="October 2, 2026"
      summary={{ headline: "Short headline", detail: "Short detail" }}
      sections={sections}
      closing={closing}
    />,
  );
}

describe("PolicyPage", () => {
  it("lists the five policies in footer order", () => {
    expect(POLICIES.map((p) => p.href)).toEqual(["/terms", "/refund-policy", "/shipping", "/privacy", "/ruo"]);
  });

  it("renders title, version line and the short version", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Shipping Policy.");
    expect(screen.getByText(`Version ${TERMS_VERSION} · Last updated October 2, 2026`)).toBeInTheDocument();
    const box = screen.getByTestId("policy-summary");
    expect(box).toHaveTextContent("The short version");
    expect(box).toHaveTextContent("Short headline");
    expect(box).toHaveTextContent("Short detail");
  });

  it("numbers sections in order with their stable ids", () => {
    const { container } = renderPage();
    const rendered = Array.from(container.querySelectorAll("section[data-policy-section]"));
    expect(rendered.map((s) => s.id)).toEqual(["alpha", "beta", "gamma"]);
    expect(rendered.map((s) => s.querySelector("[data-section-number]")?.textContent)).toEqual(["§ 01", "§ 02", "§ 03"]);
    expect(rendered.map((s) => s.querySelector("h2")?.textContent)).toEqual(["Alpha heading", "Beta heading", "Gamma heading"]);
  });

  it("renders a contents list linking to each section in order", () => {
    renderPage();
    const toc = screen.getByRole("navigation", { name: "Contents" });
    expect(within(toc).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["#alpha", "#beta", "#gamma"]);
  });

  it("closes with links to the other four policies, not itself", () => {
    renderPage();
    const related = screen.getByRole("navigation", { name: "Related policies" });
    expect(within(related).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/terms", "/refund-policy", "/privacy", "/ruo"]);
    expect(screen.getByRole("heading", { level: 2, name: "Related policies" })).toBeInTheDocument();
  });

  it("uses an Acknowledgment heading and body when closing copy is given", () => {
    renderPage(<p>By ordering you accept.</p>);
    expect(screen.getByRole("heading", { level: 2, name: "Acknowledgment" })).toBeInTheDocument();
    expect(screen.getByText("By ordering you accept.")).toBeInTheDocument();
  });
});
