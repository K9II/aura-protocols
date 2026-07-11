import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import VendorCompareList from "@/components/VendorCompareList";

const twoVendors = [
  { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/x", commission: "15%" },
  { vendor: "Swiss Chems", url: "https://swisschems.is/x", commission: "20%" },
];

const fiveVendors = [
  ...twoVendors,
  { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/x", commission: "20%" },
  { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/x", commission: "15%" },
  { vendor: "Main Peptides", url: "https://mainpeptides.com/x", commission: "10%" },
];

describe("VendorCompareList", () => {
  it("renders no checkboxes when fewer than 3 vendors", () => {
    render(<VendorCompareList vendors={twoVendors} productSlug="bpc-157" />);
    expect(screen.queryAllByRole("checkbox").length).toBe(0);
  });

  it("renders one checkbox per vendor when 3 or more vendors", () => {
    render(<VendorCompareList vendors={fiveVendors} productSlug="bpc-157" />);
    expect(screen.getAllByRole("checkbox").length).toBe(5);
  });

  it("shows a comparison table only after 2+ vendors are checked", () => {
    render(<VendorCompareList vendors={fiveVendors} productSlug="bpc-157" />);
    expect(screen.queryByText(/Comparing \d Vendors/)).toBeNull();

    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]);
    expect(screen.queryByText(/Comparing \d Vendors/)).toBeNull();

    fireEvent.click(boxes[1]);
    expect(screen.getByText("Comparing 2 Vendors")).toBeInTheDocument();
  });

  it("comparison table never renders a dollar sign or the word commission", () => {
    const { container } = render(<VendorCompareList vendors={fiveVendors} productSlug="bpc-157" />);
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(boxes[2]);
    expect(screen.getByText("Comparing 3 Vendors")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\$|commission/i);
  });
});
