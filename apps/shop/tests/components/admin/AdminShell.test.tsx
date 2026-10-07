import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const nav = vi.hoisted(() => ({ path: "/admin/discounts/abc" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));
vi.mock("@/app/auth/actions", () => ({ signOutToSignInAction: vi.fn() }));

describe("AdminShell", () => {
  it("has a Sign out button in the owner block", async () => {
    nav.path = "/admin";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0, email: 0, today: 0, disputes: 0, inquiries: 4 }} testMode ownerName="Kearney"><p /></AdminShell>);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("marks the current section, shows counts, greys out modules not built yet", async () => {
    nav.path = "/admin/discounts/abc";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 3, partners: 2, email: 0, today: 0, disputes: 0, inquiries: 4 }} testMode ownerName="Kearney">{<p>page</p>}</AdminShell>);
    expect(screen.getByRole("link", { name: /Discounts/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Orders/ })).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: "Customers" })).toHaveAttribute("href", "/admin/customers");
    expect(screen.getByRole("link", { name: /Inquiries/ })).toHaveAttribute("href", "/admin/inquiries");
    expect(within(screen.getByRole("link", { name: /Inquiries/ })).getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Test mode")).toBeInTheDocument();
    expect(screen.getByText("page")).toBeInTheDocument();
  });

  it("Catalog & lots is live in the menu", async () => {
    nav.path = "/admin/catalog";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0, email: 0, today: 0, disputes: 0, inquiries: 4 }} testMode ownerName="Kearney"><p /></AdminShell>);
    expect(screen.getByRole("link", { name: /Catalog & lots/ })).toHaveAttribute("href", "/admin/catalog");
  });

  it("Email is live in the menu with a count", async () => {
    nav.path = "/admin/email";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0, email: 3, today: 0, disputes: 0, inquiries: 4 }} testMode ownerName="Kearney"><p /></AdminShell>);
    const link = screen.getByRole("link", { name: /Email/ });
    expect(link).toHaveAttribute("href", "/admin/email");
    expect(link).toHaveTextContent("3");
    expect(link.closest("[aria-disabled]")).toBeNull();
  });

  it("hides the Test mode tag on live keys", async () => {
    nav.path = "/admin/discounts/abc";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0, email: 0, today: 0, disputes: 0, inquiries: 4 }} testMode={false} ownerName="Kearney"><p /></AdminShell>);
    expect(screen.queryByText("Test mode")).toBeNull();
  });

  it("links the current page to its Guide chapter", async () => {
    nav.path = "/admin/discounts/abc";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0, email: 0, today: 0, disputes: 0, inquiries: 4 }} testMode ownerName="Kearney"><p /></AdminShell>);
    expect(screen.getByRole("link", { name: "How this works" })).toHaveAttribute("href", "/admin/guide#discounts");
    expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute("href", "/admin/guide");
  });

  it("on the Guide itself: no help link, Guide marked current", async () => {
    nav.path = "/admin/guide";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0, email: 0, today: 0, disputes: 0, inquiries: 4 }} testMode ownerName="Kearney"><p /></AdminShell>);
    expect(screen.queryByRole("link", { name: "How this works" })).toBeNull();
    expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute("aria-current", "page");
  });

  it("Today is live at /admin with the to-do count, current on /admin and Past alerts only", async () => {
    nav.path = "/admin";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    const { unmount } = render(<AdminShell counts={{ orders: 0, partners: 0, email: 0, today: 21, disputes: 0, inquiries: 4 }} testMode ownerName="Kearney"><p /></AdminShell>);
    const link = screen.getByRole("link", { name: /Today/ });
    expect(link).toHaveAttribute("href", "/admin");
    expect(link).toHaveTextContent("21");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link.closest("[aria-disabled]")).toBeNull();
    unmount();
    nav.path = "/admin/alerts";
    render(<AdminShell counts={{ orders: 0, partners: 0, email: 0, today: 0, disputes: 0, inquiries: 4 }} testMode ownerName="Kearney"><p /></AdminShell>);
    expect(screen.getByRole("link", { name: /Today/ })).toHaveAttribute("aria-current", "page");
  });

  it("Today isn't marked current on the other admin pages", async () => {
    nav.path = "/admin/discounts/abc";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0, email: 0, today: 4, disputes: 0, inquiries: 4 }} testMode ownerName="Kearney"><p /></AdminShell>);
    expect(screen.getByRole("link", { name: /Today/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: /Discounts/ })).toHaveAttribute("aria-current", "page");
  });

  it("Disputes is live under Sell with its count", async () => {
    nav.path = "/admin/disputes/0b6f1c2e-1111-4222-8333-944455556666";
    const { default: AdminShell } = await import("@/components/admin/AdminShell");
    render(<AdminShell counts={{ orders: 0, partners: 0, email: 0, today: 0, disputes: 4, inquiries: 4 }} testMode ownerName="Kearney"><p /></AdminShell>);
    const link = screen.getByRole("link", { name: /Disputes/ });
    expect(link).toHaveAttribute("href", "/admin/disputes");
    expect(link).toHaveTextContent("4");
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
