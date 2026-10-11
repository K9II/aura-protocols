import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TierTable from "@/components/store/wholesale/TierTable";

describe("TierTable", () => {
  it("ends the top tier at 49 kits and adds the volume quote card linking to the form", () => {
    render(<TierTable tiers={[{ minKits: 5, pct: 30 }, { minKits: 10, pct: 35 }, { minKits: 20, pct: 40 }]} activePct={40} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[2].textContent).toBe("20–49 kits40% off");
    expect(items[2].className).toBe("on");
    expect(items[3].textContent).toContain("50+ kits");
    expect(items[3].textContent).toContain("Volume quote");
    expect(screen.getByRole("link", { name: "Ask us ↓" }).getAttribute("href")).toBe("#volume-quote");
  });

  it("shows no quote card when the top tier already starts at the threshold", () => {
    render(<TierTable tiers={[{ minKits: 5, pct: 30 }, { minKits: 50, pct: 45 }]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("50+")).toBeTruthy();
    expect(screen.queryByText("Volume quote")).toBeNull();
  });
});
