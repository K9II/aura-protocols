import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RecommendationCard from "@/components/RecommendationCard";
import { DISCLAIMER, PRESCRIBE_CTA_COPY } from "@/lib/constants";

const sample = {
  id: "rec-1",
  output: {
    template: "RECOVERY" as const,
    headline: "Personalized recovery stack",
    steps: [{ compound: "BPC-157", dose: "250 mcg/day", timing: "AM", rationale: "soft tissue support" }],
    lifestyle: ["Sleep 8h"],
    cycle: "4 on / 2 off",
    caveats: ["Stop on adverse signal"],
  },
};

describe("RecommendationCard", () => {
  it("renders headline, steps, lifestyle, cycle, caveats", () => {
    render(<RecommendationCard {...sample} />);
    expect(screen.getByRole("heading", { name: /personalized recovery stack/i })).toBeInTheDocument();
    expect(screen.getByText(/BPC-157/)).toBeInTheDocument();
    expect(screen.getByText(/Sleep 8h/)).toBeInTheDocument();
    expect(screen.getByText(/4 on \/ 2 off/)).toBeInTheDocument();
    expect(screen.getByText(/Stop on adverse signal/)).toBeInTheDocument();
  });

  it("always mounts disclaimer, prescribe CTA, and feedback widget", () => {
    render(<RecommendationCard {...sample} />);
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: PRESCRIBE_CTA_COPY })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /thumbs up/i })).toBeInTheDocument();
  });
});
