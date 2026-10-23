import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const showComingSoon = vi.fn();
vi.mock("@/lib/early/access", () => ({ showComingSoon: () => showComingSoon() }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: async () => null }));
vi.mock("@/components/store/coming-soon/ComingSoon", () => ({
  default: ({ notice }: { notice?: string }) => <div data-testid="coming-soon">{notice ?? "no notice"}</div>,
}));

describe("/ before launch", () => {
  beforeEach(() => { vi.resetModules(); showComingSoon.mockReset(); });

  it("is the coming-soon page, with the notice after a closed early link", async () => {
    showComingSoon.mockResolvedValue(true);
    const { default: HomePage } = await import("@/app/page");
    render(await HomePage({ searchParams: Promise.resolve({ early: "closed" }) }));
    expect(screen.getByTestId("coming-soon").textContent).toBe("Early access isn't open right now.");
  });

  it("no notice on a plain visit", async () => {
    showComingSoon.mockResolvedValue(true);
    const { default: HomePage } = await import("@/app/page");
    render(await HomePage());
    expect(screen.getByTestId("coming-soon").textContent).toBe("no notice");
  });

  it("an early-access browser gets the store home (here: Unavailable without a catalog)", async () => {
    showComingSoon.mockResolvedValue(false);
    const { default: HomePage } = await import("@/app/page");
    render(await HomePage());
    expect(screen.queryByTestId("coming-soon")).toBeNull();
  });
});
