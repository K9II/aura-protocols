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

  it("names the carrier and shows the number in groups of four", () => {
    render(<OrderCard order={{ ...base, status: "shipped", tracking_number: "9400111899223344556677", carrier: "usps" }} />);
    expect(screen.getByText(/USPS tracking/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "9400 1118 9922 3344 5566 77" }))
      .toHaveAttribute("href", "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223344556677");
  });

  it("links each lot of a split line to COA lookup", () => {
    const ITEM = base.order_items![0];
    render(<OrderCard order={{ ...base, status: "paid", order_items: [{ ...ITEM, lot_number: "BPC-2609-01, BPC-2610-02" }] }} />);
    expect(screen.getByRole("link", { name: "Lot BPC-2609-01" })).toHaveAttribute("href", "/coa?lot=BPC-2609-01");
    expect(screen.getByRole("link", { name: "Lot BPC-2610-02" })).toHaveAttribute("href", "/coa?lot=BPC-2610-02");
  });

  it("a no-charge order reads No charge and Preparing to ship, never Paid", () => {
    render(<OrderCard order={{ ...base, kind: "no_charge", total_cents: 0, status: "paid" }} />);
    expect(screen.getByText("No charge")).toBeInTheDocument();
    expect(screen.getByText("Preparing to ship")).toBeInTheDocument();
    expect(screen.queryByText(/Paid/)).toBeNull();
    expect(screen.queryByText("$0.00")).toBeNull();
  });

  it("a cancelled no-charge order reads Cancelled (no charge), never Refunded", () => {
    render(<OrderCard order={{ ...base, kind: "no_charge", total_cents: 0, status: "refunded" }} />);
    expect(screen.getByText("Cancelled (no charge)")).toBeInTheDocument();
    expect(screen.queryByText(/Refunded/)).toBeNull();
  });
});
