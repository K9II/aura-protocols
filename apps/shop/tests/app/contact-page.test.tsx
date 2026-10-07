import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({ getAccountState: vi.fn(), listOrdersForCustomer: vi.fn() }));
vi.mock("@/lib/dal", () => ({ getAccountState: m.getAccountState }));
vi.mock("@/lib/orders", () => ({ listOrdersForCustomer: m.listOrdersForCustomer }));

describe("/contact", () => {
  it("pre-fills a signed-in customer and lists their recent orders", async () => {
    m.getAccountState.mockResolvedValue({ customer: { id: "c1", fullName: "Dana Whitfield", email: "dana.w@example.com" } });
    m.listOrdersForCustomer.mockResolvedValue([{ order_number: "AP-1052", created_at: "2026-10-01T18:00:00Z", total_cents: 26800 }]);
    const { default: ContactPage } = await import("@/app/contact/page");
    render(await ContactPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Write to us.");
    expect(screen.getByRole("option", { name: "AP-1052 · Oct 1 · $268.00" })).toBeInTheDocument();
  });
  it("works signed out (and when the session check fails)", async () => {
    m.getAccountState.mockRejectedValue(new Error("auth down"));
    const { default: ContactPage } = await import("@/app/contact/page");
    render(await ContactPage());
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});
