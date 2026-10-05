import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireOwner, getDiscountCap } = vi.hoisted(() => ({
  requireOwner: vi.fn(async () => ({ id: "o1", fullName: "Kearney Adams", isOwner: true })),
  getDiscountCap: vi.fn(async () => 35),
}));
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/discounts/data", () => ({ getDiscountCap }));
import AdminGuidePage from "@/app/admin/guide/page";

describe("/admin/guide", () => {
  beforeEach(() => { requireOwner.mockClear(); getDiscountCap.mockResolvedValue(35); });

  it("is owner-only", async () => {
    requireOwner.mockRejectedValueOnce(new Error("NEXT_NOT_FOUND"));
    await expect(AdminGuidePage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders every chapter with the live cap", async () => {
    getDiscountCap.mockResolvedValue(30);
    render(await AdminGuidePage());
    expect(requireOwner).toHaveBeenCalled();
    for (const t of ["Start here", "Discounts", "Orders", "Partners", "Payouts"]) expect(screen.getByRole("heading", { level: 2, name: t })).toBeInTheDocument();
    expect(screen.getAllByText(/30%/).length).toBeGreaterThan(0);
  });
});
