import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OrderCard from "@/components/account/OrderCard";
import type { OrderRow } from "@/lib/orders";

const base = { order_number: "AP-1042", created_at: "2026-10-14T12:00:00Z", total_cents: 28230, tracking_number: null, carrier: null,
  order_items: [{ compound_name: "BPC-157", compound_slug: "bpc-157", strength: "10 mg", pack_qty: 3, quantity: 1, lot_number: "AP-0001" }] } as unknown as OrderRow;

describe("OrderCard", () => {
  it("shows status, total, items and a certificate link per lot", () => {
    render(<OrderCard order={{ ...base, status: "paid" }} />);
    expect(screen.getByText("Order AP-1042")).toBeInTheDocument();
    expect(screen.getByText("Paid — preparing to ship")).toBeInTheDocument();
    expect(screen.getByText("$282.30")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lot AP-0001/i })).toHaveAttribute("href", "/coa?lot=AP-0001");
  });

  it("links tracking when shipped", () => {
    render(<OrderCard order={{ ...base, status: "shipped", tracking_number: "9400", carrier: "usps" }} />);
    expect(screen.getByRole("link", { name: "9400" })).toHaveAttribute("href", "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400");
  });
});
