import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const flags = vi.hoisted(() => ({ published: true }));
vi.mock("@/lib/constants", async (orig) => ({ ...(await orig<typeof import("@/lib/constants")>()), get BLOG_PUBLISHED() { return flags.published; } }));
import ResearchSummary from "@/components/store/ResearchSummary";

describe("ResearchSummary", () => {
  beforeEach(() => { flags.published = true; });

  it("shows the extract and links the full summary", () => {
    render(<ResearchSummary productSlug="mots-c" name="MOTS-c" />);
    expect(screen.getByRole("heading", { name: "Research summary" })).toBeInTheDocument();
    expect(screen.getByText("Where research is heading")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read the full research summary/ })).toHaveAttribute("href", "/blog/mots-c-research-guide");
  });

  it("is hidden while the blog is unpublished (the link would lead nowhere)", () => {
    flags.published = false;
    const { container } = render(<ResearchSummary productSlug="mots-c" name="MOTS-c" />);
    expect(container.innerHTML).toBe("");
  });
});
