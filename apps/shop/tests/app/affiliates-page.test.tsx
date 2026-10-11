import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { getCustomer, getPartnerForCustomer } = vi.hoisted(() => ({ getCustomer: vi.fn(), getPartnerForCustomer: vi.fn() }));
vi.mock("@/lib/dal", () => ({ getCustomer }));
vi.mock("@/lib/partners/data", () => ({ getPartnerForCustomer }));
vi.mock("@/components/partners/EarningsCalculator", () => ({ default: () => null }));
import AffiliatesPage from "@/app/affiliates/page";

const buttons = (name: string) => screen.getAllByRole("link", { name });

describe("/affiliates", () => {
  beforeEach(() => {
    getCustomer.mockReset(); getPartnerForCustomer.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("offers Apply to signed-out visitors and to customers who aren't partners", async () => {
    getCustomer.mockResolvedValue(null);
    render(await AffiliatesPage());
    expect(buttons("Apply to partner →")).toHaveLength(2);
    buttons("Apply to partner →").forEach((a) => expect(a).toHaveAttribute("href", "/partners/apply"));
  });

  it("a partner keeps the program page, with both buttons opening their dashboard", async () => {
    getCustomer.mockResolvedValue({ id: "c1" });
    getPartnerForCustomer.mockResolvedValue({ id: "p1", status: "approved" });
    render(await AffiliatesPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Partner with Aura.");
    expect(buttons("Open your dashboard →")).toHaveLength(2);
    buttons("Open your dashboard →").forEach((a) => expect(a).toHaveAttribute("href", "/partners"));
    expect(screen.queryByRole("link", { name: "Apply to partner →" })).toBeNull();
  });

  it("a failed check still shows the page with Apply, and is logged", async () => {
    getCustomer.mockRejectedValue(new Error("db down"));
    render(await AffiliatesPage());
    expect(buttons("Apply to partner →")).toHaveLength(2);
    expect(console.error).toHaveBeenCalledWith("partner check on /affiliates failed:", expect.any(Error));
  });
});
