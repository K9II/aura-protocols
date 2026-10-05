import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({ path: "/admin/discounts/abc" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));

describe("AdminShell", () => {
  it("marks the current section, shows counts, greys out modules not built yet", async () => {
    nav.path = "/admin/discounts/abc";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 3, partners: 2 }} testMode ownerName="Kearney">{<p>page</p>}</AdminShell>);
    expect(screen.getByRole("link", { name: /Discounts/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Orders/ })).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: "Customers" })).toHaveAttribute("href", "/admin/customers");
    expect(screen.getByText("Inquiries").closest("[aria-disabled]")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Test mode")).toBeInTheDocument();
    expect(screen.getByText("page")).toBeInTheDocument();
  });

  it("hides the Test mode tag on live keys", async () => {
    nav.path = "/admin/discounts/abc";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0 }} testMode={false} ownerName="Kearney"><p /></AdminShell>);
    expect(screen.queryByText("Test mode")).toBeNull();
  });

  it("links the current page to its Guide chapter", async () => {
    nav.path = "/admin/discounts/abc";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0 }} testMode ownerName="Kearney"><p /></AdminShell>);
    expect(screen.getByRole("link", { name: "How this works" })).toHaveAttribute("href", "/admin/guide#discounts");
    expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute("href", "/admin/guide");
  });

  it("on the Guide itself: no help link, Guide marked current", async () => {
    nav.path = "/admin/guide";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0 }} testMode ownerName="Kearney"><p /></AdminShell>);
    expect(screen.queryByRole("link", { name: "How this works" })).toBeNull();
    expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute("aria-current", "page");
  });
});
