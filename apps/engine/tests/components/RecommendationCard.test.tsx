import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RecommendationCard from "@/components/RecommendationCard";
import { DISCLAIMER } from "@/lib/constants";

const SAMPLE_RULES = {
  template: "RECOVERY" as const,
  triggers: ["sleep_deficit"],
  contraindications: [],
  doseCeilings: {},
};

const sample = {
  id: "rec-1",
  rules: SAMPLE_RULES,
  routing: "affiliate_primary" as const,
  output: {
    template: "RECOVERY" as const,
    headline: "Personalized recovery stack",
    steps: [{ compound: "BPC-157", dose: "250 mcg/day", timing: "AM", rationale: "soft tissue support", resonance: 0.82, resonanceReason: "recovery 40 · trending down 7d", titration: null }],
    lifestyle: ["Sleep 8h"],
    cycle: "4 on / 2 off",
    caveats: ["Stop on adverse signal"],
    protein: [{ name: "Whey Protein", dose: "30g post-workout", rationale: "muscle repair", affiliateSlot: null }],
    vitamins: [{ name: "Magnesium Glycinate", dose: "400mg before bed", rationale: "sleep quality", affiliateSlot: null }],
    foods: [{ name: "Salmon", frequency: "3x/week", rationale: "omega-3 anti-inflammatory" }],
  },
};

describe("RecommendationCard", () => {
  it("renders disclaimer and feedback widget", () => {
    render(<RecommendationCard {...sample} />);
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /thumbs up/i })).toBeInTheDocument();
  });

  it("shows Peptides tab content by default", () => {
    render(<RecommendationCard {...sample} />);
    expect(screen.getAllByText(/BPC-157/).length).toBeGreaterThan(0);
  });

  it("renders all 4 tab buttons", () => {
    render(<RecommendationCard {...sample} />);
    expect(screen.getByRole("button", { name: /peptides/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /protein/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /vitamins/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /foods/i })).toBeInTheDocument();
  });

  it("switches to Protein tab on click", () => {
    render(<RecommendationCard {...sample} />);
    fireEvent.click(screen.getByRole("button", { name: /protein/i }));
    expect(screen.getByText(/Whey Protein/)).toBeInTheDocument();
  });

  it("switches to Foods tab on click", () => {
    render(<RecommendationCard {...sample} />);
    fireEvent.click(screen.getByRole("button", { name: /foods/i }));
    expect(screen.getByText(/Salmon/)).toBeInTheDocument();
  });
});
