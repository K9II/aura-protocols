import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/discounts/abc" }));

describe("AdminShell", () => {
  it("marks the current section, shows counts, greys out modules not built yet", async () => {
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 3, partners: 2 }} testMode ownerName="Kearney">{<p>page</p>}</AdminShell>);
    expect(screen.getByRole("link", { name: /Discounts/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Orders/ })).toHaveTextContent("3");
    expect(screen.getByText("Customers").closest("[aria-disabled]")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Test mode")).toBeInTheDocument();
    expect(screen.getByText("page")).toBeInTheDocument();
  });

  it("hides the Test mode tag on live keys", async () => {
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0 }} testMode={false} ownerName="Kearney"><p /></AdminShell>);
    expect(screen.queryByText("Test mode")).toBeNull();
  });
});
